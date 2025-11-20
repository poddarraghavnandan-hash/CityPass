/**
 * /api/ask - Understand user intention from free text
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { askAgent } from '@citypass/agent';
import { AskInputSchema } from '@/lib/schemas';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const traceId = randomUUID();

  // Rate limiting: 100 requests per minute per IP
  const rateLimitId = getRateLimitIdentifier(req);
  const rateLimit = checkRateLimit({
    identifier: rateLimitId,
    limit: 100,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        traceId,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter),
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      }
    );
  }

  try {
    const payload = await req.json();
    const body = AskInputSchema.parse(payload);

    const cookieIntention = req.cookies.get('citylens_intention')?.value;

    // Use LLM/pattern extraction to parse free text
    const { extractIntentWithFallback } = await import('@citypass/utils');

    const useLLM = process.env.DISABLE_LLM_INTENT !== 'true';
    const llmModel = (process.env.LLM_INTENT_MODEL || 'auto') as 'claude' | 'gpt' | 'auto';

    const extractionResult = await extractIntentWithFallback(body.freeText, {
      useLLM,
      llmModel,
      baseTokens: body.context?.overrides,
    });

    console.log(`✨ [${traceId}] Intent extracted via ${extractionResult.method}`);
    console.log(`[${traceId}] User query:`, body.freeText);
    console.log(`[${traceId}] Extracted tokens:`, JSON.stringify(extractionResult.tokens, null, 2));
    console.log(`[${traceId}] City context:`, body.context?.city || 'none');

    const agentResult = await askAgent({
      freeText: body.freeText,
      city: body.context?.city,
      userId: body.context?.userId,
      sessionId: body.context?.sessionId,
      traceId,
    });

    const intention = agentResult.state.intention ?? {
      city: body.context?.city || 'Unknown',
      nowISO: new Date().toISOString(),
      tokens: extractionResult.tokens,
      source: 'inferred' as const,
    };

    return NextResponse.json({
      tokens: intention.tokens,
      intention,
      traceId,
      success: true,
      meta: {
        extractionMethod: extractionResult.method,
        extractionMetadata: extractionResult.metadata,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Validation failed',
          traceId,
          validationErrors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error(`[${traceId}] ask error:`, error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        traceId,
      },
      { status: 500 }
    );
  }
}
