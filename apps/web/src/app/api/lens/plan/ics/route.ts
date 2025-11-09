import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { z } from 'zod';

const RequestSchema = z.object({
  eventId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId } = RequestSchema.parse(body);

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const ics = buildIcs(event);

    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slugify(event.title)}.ics"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('plan/ics error', error);
    return NextResponse.json({ error: 'Unable to generate calendar entry' }, { status: 500 });
  }
}

function buildIcs(event: any) {
  const start = formatDate(event.startTime);
  const end = formatDate(event.endTime ?? new Date(new Date(event.startTime).getTime() + 2 * 60 * 60 * 1000));
  const now = formatDate(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CityLens//CityPass//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@citylens`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(event.title)}`,
    event.venueName ? `LOCATION:${escapeText(event.venueName)}` : '',
    event.description ? `DESCRIPTION:${escapeText(event.description)}` : '',
    event.bookingUrl ? `URL:${event.bookingUrl}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
}

function escapeText(text: string) {
  return text.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
