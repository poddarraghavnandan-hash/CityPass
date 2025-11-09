/**
 * /api/plan - Create 3 recommendation slates using agent
 * GET ?ics=<eventId> - Download event as ICS calendar file
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { plan } from '@citypass/agent';
import { IntentionTokensSchema } from '@citypass/types/lens';
import { prisma } from '@citypass/db';

const BodySchema = z.object({
  user: z
    .object({
      id: z.string(),
      city: z.string().optional(),
    })
    .optional(),
  freeText: z.string().optional(),
  tokens: IntentionTokensSchema.partial().optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const payload = await req.json();
    const body = BodySchema.parse(payload);

    const result = await plan({
      user: body.user,
      freeText: body.freeText,
      tokens: body.tokens,
    });

    const latency = Date.now() - startTime;

    return NextResponse.json({
      slates: result.state.slates,
      reasons: result.state.reasons,
      intention: result.state.intention,
      logs: result.logs,
      latencyMs: latency,
      traceId: result.state.traceId,
      success: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 }
      );
    }

    console.error('plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/plan?ics=<eventId>
 * Download event as ICS calendar file
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const eventId = searchParams.get('ics');

  if (!eventId) {
    return NextResponse.json(
      { error: 'Missing ics parameter' },
      { status: 400 }
    );
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const ics = generateICS(event);

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="event-${eventId}.ics"`,
      },
    });
  } catch (error) {
    console.error('ICS generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate ICS calendar file
 */
function generateICS(event: any): string {
  const now = new Date();
  const formatDate = (date: Date) => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  };

  const startTime = formatDate(event.startTime);
  const endTime = event.endTime
    ? formatDate(event.endTime)
    : formatDate(new Date(event.startTime.getTime() + 2 * 60 * 60 * 1000)); // +2 hours default

  const location = [event.venueName, event.address, event.city]
    .filter(Boolean)
    .join(', ');

  const description = event.description || event.title;
  const url = event.bookingUrl || event.sourceUrl || '';

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//CityPass//Event Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${event.id}@citypass.app
DTSTAMP:${formatDate(now)}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${event.title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${location}
URL:${url}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
}
