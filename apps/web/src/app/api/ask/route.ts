/**
 * /api/ask - Understand user intention from free text
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { understand } from '@citypass/agent';
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

    const result = await understand({
      freeText: body.freeText,
      city: body.context?.city,
      userId: body.context?.userId,
      sessionId: body.context?.sessionId,
      cookie: cookieIntention,
      overrides: body.context?.overrides,
    });

    return NextResponse.json({
      tokens: result.tokens,
      intention: result.intention,
      traceId,
      success: true,
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
