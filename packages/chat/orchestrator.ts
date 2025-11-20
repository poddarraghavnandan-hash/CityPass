/**
 * Chat Brain V2 - Orchestrator
 * Coordinates the full chat turn: Context → Analyst → Planner → Stylist → Persistence
 */

import { prisma } from '@citypass/db';
import { buildChatContextSnapshot } from './contextAssembler';
import { runAnalystLLM } from './analyst';
import { runPlanner } from './planner';
import { runStylistLLM } from './stylist';
import type { RunChatTurnInput, RunChatTurnOutput, ChatTurnRecord } from './types';

/**
 * Run complete chat turn pipeline
 */
export async function runChatTurn(input: RunChatTurnInput): Promise<RunChatTurnOutput> {
  const { userId, anonId, freeText, cityHint, threadId } = input;

  console.log('[Orchestrator] Starting chat turn:', { userId, anonId, freeText: freeText.slice(0, 50) });

  try {
    // 1. Build ChatContextSnapshot
    console.log('[Orchestrator] Step 1: Building context snapshot');
    const contextSnapshot = await buildChatContextSnapshot({
      userId,
      anonId,
      freeText,
      cityHint,
      threadId,
    });

    // 2. Run Analyst LLM
    console.log('[Orchestrator] Step 2: Running Analyst');
    const analystOutput = await runAnalystLLM(contextSnapshot);

    // 3. Run Planner
    console.log('[Orchestrator] Step 3: Running Planner');
    const plannerDecision = await runPlanner(contextSnapshot, analystOutput);

    // 4. Run Stylist LLM
    console.log('[Orchestrator] Step 4: Running Stylist');
    const stylistOutput = await runStylistLLM(contextSnapshot, plannerDecision);

    // 5. Persist to database
    console.log('[Orchestrator] Step 5: Persisting to database');
    const persistedThreadId = await persistChatTurn({
      contextSnapshot,
      analystOutput,
      plannerDecision,
      stylistReply: stylistOutput.reply,
      createdAt: new Date().toISOString(),
    });

    console.log('[Orchestrator] ✓ Chat turn complete:', contextSnapshot.traceId);

    return {
      threadId: persistedThreadId,
      plannerDecision,
      reply: stylistOutput.reply,
      context: contextSnapshot,
    };
  } catch (error) {
    console.error('[Orchestrator] Chat turn failed:', error);

    // Graceful degradation
    const nowISO = new Date().toISOString();
    return {
      threadId: threadId || 'error',
      plannerDecision: {
        intention: {
          primaryGoal: freeText,
          timeWindow: { fromISO: nowISO, toISO: nowISO },
          city: cityHint || 'New York',
          vibeDescriptors: [],
          constraints: [],
          notes: 'Error occurred',
        } as any,
        slates: [],
        meta: {
          traceId: 'error',
          banditPolicyName: null,
          usedProfile: false,
          usedLearnerState: false,
        },
      },
      reply: 'Sorry, I encountered an error processing your request. Please try again.',
      context: {
        userId,
        anonId,
        sessionId: threadId || 'error',
        freeText,
        nowISO,
        city: cityHint || 'New York',
        locationApprox: null,
        profile: {
          moodsPreferred: [],
          dislikes: [],
          budgetBand: null,
          maxTravelMinutes: null,
          scheduleBias: null,
          socialStyle: null,
          tasteVectorId: null,
        },
        learnerState: {
          explorationLevel: 'MEDIUM',
          noveltyTarget: 0.3,
          banditPolicyName: 'default',
        },
        chatHistorySummary: 'Error occurred',
        recentPicksSummary: '',
        searchWindow: { fromISO: nowISO, toISO: nowISO },
        candidateEvents: [],
        traceId: 'error',
      } as any,
    };
  }
}

/**
 * Persist chat turn to database
 */
async function persistChatTurn(turnRecord: ChatTurnRecord): Promise<string> {
  const { contextSnapshot, analystOutput, plannerDecision, stylistReply } = turnRecord;
  const { userId, anonId, sessionId, traceId } = contextSnapshot;

  try {
    // 1. Ensure thread exists
    let thread = await prisma.chatThread.findFirst({
      where: {
        OR: [
          { id: sessionId },
          userId ? { userId } : undefined,
          anonId ? { anonId } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          id: sessionId,
          userId,
          anonId,
        },
      });
      console.log('[Orchestrator] Created new thread:', thread.id);
    }

    // 2. Insert user message
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'user',
        freeText: contextSnapshot.freeText,
        rawPayload: {
          contextSnapshot,
        },
      },
    });

    // 3. Insert assistant message
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        role: 'assistant',
        modelReply: stylistReply,
        rawPayload: {
          analystOutput,
          plannerDecision,
        },
      },
    });

    // 4. Insert slate decision
    await prisma.slateDecision.create({
      data: {
        traceId,
        threadId: thread.id,
        userId,
        intentionJson: plannerDecision.intention as any,
        slatesJson: plannerDecision.slates as any,
        banditPolicyName: plannerDecision.meta.banditPolicyName,
        usedProfile: plannerDecision.meta.usedProfile,
        usedLearnerState: plannerDecision.meta.usedLearnerState,
      },
    });

    // 5. Upsert user context snapshot
    if (userId) {
      await prisma.userContextSnapshot.upsert({
        where: { userId },
        create: {
          userId,
          lastTraceId: traceId,
          lastIntentionJson: plannerDecision.intention as any,
          lastTasteVectorId: contextSnapshot.profile.tasteVectorId,
          lastUpdatedAt: new Date(),
        },
        update: {
          lastTraceId: traceId,
          lastIntentionJson: plannerDecision.intention as any,
          lastTasteVectorId: contextSnapshot.profile.tasteVectorId,
          lastUpdatedAt: new Date(),
        },
      });
    }

    console.log('[Orchestrator] ✓ Persisted chat turn to database');
    return thread.id;
  } catch (error) {
    console.error('[Orchestrator] Failed to persist chat turn:', error);
    // Return session ID even if persistence fails
    return sessionId;
  }
}

/**
 * Retrieve chat history for a thread
 */
export async function getChatHistory(threadId: string): Promise<ChatTurnRecord[]> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      select: {
        role: true,
        freeText: true,
        modelReply: true,
        rawPayload: true,
        createdAt: true,
      },
    });

    // Reconstruct turn records from messages
    const turns: ChatTurnRecord[] = [];
    for (let i = 0; i < messages.length; i += 2) {
      const userMsg = messages[i];
      const assistantMsg = messages[i + 1];

      if (userMsg && assistantMsg) {
        const userPayload = userMsg.rawPayload as any;
        const assistantPayload = assistantMsg.rawPayload as any;

        turns.push({
          contextSnapshot: userPayload?.contextSnapshot,
          analystOutput: assistantPayload?.analystOutput,
          plannerDecision: assistantPayload?.plannerDecision,
          stylistReply: assistantMsg.modelReply || '',
          createdAt: assistantMsg.createdAt.toISOString(),
        });
      }
    }

    return turns;
  } catch (error) {
    console.error('[Orchestrator] Failed to retrieve chat history:', error);
    return [];
  }
}
