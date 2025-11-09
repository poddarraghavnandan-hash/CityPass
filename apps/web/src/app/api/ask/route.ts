/**
 * /api/ask - Understand user intention from free text
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { understand } from '@citypass/agent';
import { IntentionTokensSchema } from '@citypass/types/lens';

const BodySchema = z.object({
  freeText: z.string().optional(),
  city: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  overrides: IntentionTokensSchema.partial().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const body = BodySchema.parse(payload);

    const cookieIntention = req.cookies.get('citylens_intention')?.value;

    const intention = await understand({
      city: body.city,
      userId: body.userId,
      sessionId: body.sessionId,
      cookie: cookieIntention,
      overrides: body.overrides,
    });

    return NextResponse.json({
      intention,
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 }
      );
    }

    console.error('ask error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
