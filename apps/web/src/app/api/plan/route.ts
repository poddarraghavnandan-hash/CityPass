/**
 * /api/plan - Create 3 recommendation slates using agent
 * GET ?ics=<eventId> - Download event as ICS calendar file
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { plan } from '@citypass/agent';
import { IntentionTokensSchema, type IntentionTokens } from '@citypass/types';
import { prisma } from '@citypass/db';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { parsePreferencesCookie } from '@/lib/preferences';
import { authOptions } from '@/lib/auth';

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
  const traceId = randomUUID();

  // Rate limiting: 50 requests per minute per IP (lower limit for compute-heavy planning)
  const rateLimitId = getRateLimitIdentifier(req);
  const rateLimit = checkRateLimit({
    identifier: rateLimitId,
    limit: 50,
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
          'X-RateLimit-Limit': '50',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      }
    );
  }

  try {
    const payload = await req.json();
    const body = BodySchema.parse(payload);
    const cookieStore = await cookies();
    const prefCookie = cookieStore.get('citylens_prefs')?.value;
    const preferences = parsePreferencesCookie(prefCookie);
    const session = await getServerSession(authOptions);
    const userId = session?.user && 'id' in session.user ? (session.user as any).id : undefined;

    const mergedTokens: IntentionTokens | undefined = {
      ...(preferences
        ? {
            mood: preferences.mood,
            distanceKm: preferences.distanceKm,
            budget: preferences.budget,
          }
        : {}),
      ...(body.tokens || {}),
    };

    const result = await plan({
      user: body.user || (userId ? { id: userId } : undefined),
      freeText: body.freeText,
      tokens: mergedTokens,
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
 * Generate ICS calendar file with proper UTC timezone handling
 */
function generateICS(event: any): string {
  const now = new Date();

  /**
   * Format date in UTC for ICS (YYYYMMDDTHHMMSSZ)
   * Ensures timezone-correct calendar entries
   */
  const formatDateUTC = (date: Date): string => {
    return date
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}Z/, 'Z');
  };

  // Ensure dates are Date objects
  const startTimeDate = event.startTime instanceof Date
    ? event.startTime
    : new Date(event.startTime);

  const endTimeDate = event.endTime
    ? (event.endTime instanceof Date ? event.endTime : new Date(event.endTime))
    : new Date(startTimeDate.getTime() + 2 * 60 * 60 * 1000); // +2 hours default

  const startTime = formatDateUTC(startTimeDate);
  const endTime = formatDateUTC(endTimeDate);
  const timestamp = formatDateUTC(now);

  const location = [event.venueName, event.address, event.city]
    .filter(Boolean)
    .join(', ');

  // Escape special characters in description per RFC 5545
  const description = (event.description || event.title)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

  const summary = event.title
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');

  const url = event.bookingUrl || event.sourceUrl || '';

  // Generate ICS with proper line wrapping (75 chars per RFC 5545)
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CityPass//Event Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@citypass.app`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${startTime}`,
    `DTEND:${endTime}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    ...(url ? [`URL:${url}`] : []),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}
