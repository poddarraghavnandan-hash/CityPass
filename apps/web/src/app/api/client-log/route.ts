import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@citypass/db';

const EventSchema = z.object({
  type: z.enum([
    'QUERY',
    'SLATE_IMPRESSION',
    'CARD_VIEW',
    'CLICK_ROUTE',
    'CLICK_BOOK',
    'SAVE',
    'HIDE',
    'REASK',
    'ERROR',
    'FEEDBACK_POSITIVE',
    'FEEDBACK_NEGATIVE',
  ]),
  sessionId: z.string(),
  traceId: z.string(),
  payload: z.object({
    screen: z.enum(['chat', 'feed', 'profile', 'onboarding', 'investors', 'landing']),
    slateLabel: z.string().optional(),
    eventId: z.string().optional(),
    eventIds: z.array(z.string()).optional(),
    position: z.number().int().optional(),
    intention: z.any().optional(),
  }).passthrough(),
});

const BodySchema = z.object({
  events: z.array(EventSchema).min(1).max(50),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);
    const now = new Date();

    // Fire-and-forget insert; avoid blocking UI
    await prisma.eventLog.createMany({
      data: body.events.map(({ type, sessionId, traceId, payload }) => ({
        eventType: type,
        sessionId,
        traceId,
        payload: payload as any,
        createdAt: now,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('client-log error', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
