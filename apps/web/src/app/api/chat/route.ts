/**
 * /api/chat - Chat Brain V2 Streaming Endpoint
 * Uses new orchestrator: Context → Analyst → Planner → Stylist
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cookies } from 'next/headers';
import { runChatTurn } from '@citypass/chat';
import type { RankedItem } from '@citypass/types';
import { z } from 'zod';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

const ChatRequestSchema = z.object({
  prompt: z.string().min(1).max(1000).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
      })
    )
    .optional(),
  city: z.string().max(100).optional(),
  threadId: z.string().uuid().optional(),
}).refine(
  (data) => data.prompt || (data.messages && data.messages.length > 0),
  {
    message: 'Either prompt or messages must be provided',
  }
);

/**
 * Adapter: Convert Slate items to RankedItem[] format for backward compatibility
 */
function slateItemsToRankedItems(slateItems: any[], eventMap: Map<string, any>): RankedItem[] {
  return slateItems.map((item) => {
    const event = eventMap.get(item.eventId);
    if (!event) {
      // Event not found in candidate list - should not happen
      return null;
    }

    return {
      id: event.id,
      title: event.title,
      venueName: event.venueName || null,
      city: event.city || null,
      startTime: event.startTime,
      priceMin: event.priceMin,
      priceMax: event.priceMax,
      imageUrl: event.imageUrl || null,
      bookingUrl: event.bookingUrl || null,
      category: event.category || null,
      fitScore: item.factorScores?.tasteMatchScore || 0.5,
      moodScore: item.factorScores?.moodAlignment || null,
      socialHeat: item.factorScores?.socialHeatScore || null,
      reasons: item.reasons || [],
      sponsored: false,
      subtitle: event.subtitle || null,
      description: event.description || null,
      neighborhood: event.neighborhood || null,
      endTime: event.endTime || null,
      distanceKm: item.factorScores?.distanceKm || null,
    };
  }).filter(Boolean) as RankedItem[];
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 20 requests per minute per IP (strict limit for LLM endpoints)
    const rateLimitId = getRateLimitIdentifier(req);
    const rateLimit = checkRateLimit({
      identifier: rateLimitId,
      limit: 20,
      windowSeconds: 60,
    });

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many chat requests. Please try again in a moment.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetAt),
          },
        }
      );
    }

    const rawBody = await req.json();
    const body = ChatRequestSchema.parse(rawBody);

    // Support both prompt (old) and messages (new) formats
    let freeText = '';
    if (body.prompt) {
      freeText = body.prompt;
    } else if (body.messages && Array.isArray(body.messages)) {
      // Extract last user message from messages array
      const lastUserMessage = body.messages.filter((m) => m.role === 'user').pop();
      freeText = lastUserMessage?.content || '';
    }

    const cityHint = body.city ?? process.env.NEXT_PUBLIC_DEFAULT_CITY ?? 'New York';
    const threadId = body.threadId;

  // Get user ID from session
  const session = await getServerSession(authOptions);
  const userId = session?.user && 'id' in session.user ? (session.user as any).id : undefined;

  // Get anon ID from cookie
  const cookieStore = await cookies();
  const anonId = cookieStore.get('citylens_anon_id')?.value;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\n` + `data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`)
          );
        };

        try {
          // Send initial acknowledgment
          send('message', { text: 'Understanding your request…' });

        // Run Chat Brain V2 orchestrator
        const result = await runChatTurn({
          userId,
          anonId,
          freeText,
          cityHint,
          threadId,
        });

        const { plannerDecision, reply } = result;

        // Build event map for quick lookup
        const eventMap = new Map();
        // We need to fetch the actual events from the database based on slate item IDs
        // For now, we'll build a simplified structure

        // Send progress update
        send('message', { text: 'Curating your recommendations…' });

        // Convert slates to RankedItem[] format
        // Note: We need to fetch full event details from DB for this
        // For now, create a simplified version
        const normalizedSlates: {
          best: RankedItem[];
          wildcard: RankedItem[];
          closeAndEasy: RankedItem[];
        } = {
          best: [],
          wildcard: [],
          closeAndEasy: [],
        };

        // Try to find slates by label
        const bestSlate = plannerDecision.slates.find((s) => s.label === 'Best');
        const wildcardSlate = plannerDecision.slates.find((s) => s.label === 'Wildcard');
        const closeEasySlate = plannerDecision.slates.find((s) => s.label === 'Close & Easy');

        // For each slate, we need to fetch full event details
        // This is a limitation of the current architecture - the planner only returns event IDs
        // TODO: Refactor to include full event objects in planner output
        const eventIds = new Set<string>();
        if (bestSlate) bestSlate.items.forEach((item) => eventIds.add(item.eventId));
        if (wildcardSlate) wildcardSlate.items.forEach((item) => eventIds.add(item.eventId));
        if (closeEasySlate) closeEasySlate.items.forEach((item) => eventIds.add(item.eventId));

        // Fetch events from database
        if (eventIds.size > 0) {
          const { prisma } = await import('@citypass/db');
          const events = await prisma.event.findMany({
            where: { id: { in: Array.from(eventIds) } },
            select: {
              id: true,
              title: true,
              venueName: true,
              city: true,
              startTime: true,
              endTime: true,
              priceMin: true,
              priceMax: true,
              imageUrl: true,
              bookingUrl: true,
              category: true,
              subtitle: true,
              description: true,
              neighborhood: true,
            },
          });

          events.forEach((event) => eventMap.set(event.id, event));

          // Convert slates
          if (bestSlate) {
            normalizedSlates.best = slateItemsToRankedItems(bestSlate.items, eventMap);
          }
          if (wildcardSlate) {
            normalizedSlates.wildcard = slateItemsToRankedItems(wildcardSlate.items, eventMap);
          }
          if (closeEasySlate) {
            normalizedSlates.closeAndEasy = slateItemsToRankedItems(closeEasySlate.items, eventMap);
          }
        }

        // Extract reasons from first slate
        const reasons = bestSlate?.items[0]?.reasons || ['Recommended for you'];

        // Send final payload
        send('payload', {
          summary: reply,
          intentionSummary: `${plannerDecision.intention.vibeDescriptors[0] || 'Exploring'} · ${plannerDecision.intention.city}`,
          slates: normalizedSlates,
          reasons,
          intention: {
            city: plannerDecision.intention.city,
            tokens: {
              mood: plannerDecision.intention.vibeDescriptors[0] || null,
              fromMinutes: 0, // TODO: Calculate from timeWindow
              untilMinutes: 180, // TODO: Calculate from timeWindow
            },
          },
          traceId: result.threadId,
        });
      } catch (error: any) {
        console.error('[ChatAPI] Chat turn failed:', error);
        send('error', error?.message || 'Chat failed');
      } finally {
        controller.close();
      }
    },
  });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: error.flatten(),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.error('[ChatAPI] Request failed:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
