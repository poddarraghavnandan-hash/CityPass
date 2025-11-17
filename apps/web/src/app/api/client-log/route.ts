import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@citypass/db';

const EventSchema = z.object({
  type: z.enum([
    'query',
    'slate_impression',
    'card_view',
    'click_route',
    'click_book',
    'save',
    'hide',
    'reask',
    'error',
    'profile_update',
    'onboarding_update',
  ]),
  payload: z.record(z.any()).and(
    z.object({
      screen: z.enum(['chat', 'feed', 'profile', 'onboarding', 'investors', 'landing']),
      traceId: z.string().optional(),
      slateLabel: z.string().optional(),
      eventId: z.string().optional(),
      eventIds: z.array(z.string()).optional(),
      position: z.number().int().optional(),
      intention: z.any().optional(),
    })
  ),
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
      data: body.events.map(({ type, payload }) => ({
        type,
        payload,
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
