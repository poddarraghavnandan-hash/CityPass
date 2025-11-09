/**
 * Analytics Event Tracking API
 * Accepts batched events from the client SDK
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { z } from 'zod';

const AnalyticsEventSchema = z.object({
  type: z.enum([
    'IMPRESSION',
    'VIEW',
    'EXPAND',
    'SAVE',
    'SHARE',
    'OUTBOUND_CLICK',
    'BOOK_CLICK',
    'DISMISS',
    'HIDE_VENUE',
    'HIDE_CATEGORY',
    'REPORT',
    'AD_IMPRESSION',
    'AD_CLICK',
    'AD_VIEWABLE',
    'AD_CONVERSION',
    'SEARCH',
    'FILTER_CHANGE',
    'WEB_VITAL',
  ]),
  eventId: z.string().optional(),
  adCampaignId: z.string().optional(),
  adCreativeId: z.string().optional(),
  props: z.record(z.unknown()).optional(),
  city: z.string().optional(),
  occurredAt: z.string().datetime(),
});

const TrackRequestSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  events: z.array(AnalyticsEventSchema).max(100), // Max 100 events per batch
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId, events } = TrackRequestSchema.parse(body);

    // Check consent
    const consent = await prisma.userConsent.findUnique({
      where: { sessionId },
    });

    if (!consent?.analytics) {
      return NextResponse.json(
        { error: 'Analytics consent not given' },
        { status: 403 }
      );
    }

    // Get device type from user agent
    const userAgent = req.headers.get('user-agent') || '';
    const deviceType = getDeviceType(userAgent);

    // Insert events in batch
    const analyticsEvents = events.map(event => ({
      userId: userId || null,
      sessionId,
      eventId: event.eventId || null,
      adCampaignId: event.adCampaignId || null,
      adCreativeId: event.adCreativeId || null,
      type: event.type,
      props: event.props || {},
      city: event.city || null,
      deviceType,
      occurredAt: new Date(event.occurredAt),
    }));

    await prisma.analyticsEvent.createMany({
      data: analyticsEvents,
      skipDuplicates: true,
    });

    // Update user interactions for specific event types
    for (const event of events) {
      if (event.eventId && ['SAVE', 'SHARE', 'DISMISS'].includes(event.type)) {
        await prisma.userInteraction.upsert({
          where: {
            sessionId_eventId: {
              sessionId,
              eventId: event.eventId,
            },
          },
          create: {
            sessionId,
            userId: userId || null,
            eventId: event.eventId,
            saved: event.type === 'SAVE',
            shared: event.type === 'SHARE',
            dismissed: event.type === 'DISMISS',
          },
          update: {
            saved: event.type === 'SAVE' ? true : undefined,
            shared: event.type === 'SHARE' ? true : undefined,
            dismissed: event.type === 'DISMISS' ? true : undefined,
          },
        });
      }

      // Handle venue/category blocking
      if (event.type === 'HIDE_VENUE' && event.props?.venueName) {
        await prisma.userBlocklist.create({
          data: {
            sessionId,
            userId: userId || null,
            venueName: event.props.venueName as string,
            venueId: event.props.venueId as string | null,
            reason: 'User hidden',
          },
        });
      }

      if (event.type === 'HIDE_CATEGORY' && event.props?.category) {
        await prisma.userBlocklist.create({
          data: {
            sessionId,
            userId: userId || null,
            category: event.props.category as string,
            reason: 'User hidden',
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      tracked: events.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Track error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  const ua = userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }

  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}
