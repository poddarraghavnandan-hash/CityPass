/**
 * Ad Tracking API - Click, Viewability, and Conversion tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { z } from 'zod';
import { isWithinAttributionWindow } from '@citypass/search';

const AdTrackRequestSchema = z.object({
  impressionId: z.string(),
  type: z.enum(['CLICK', 'VIEWABLE', 'CONVERSION']),
  conversionType: z.enum(['BOOK_CLICK', 'OUTBOUND_CLICK', 'SAVE', 'SHARE']).optional(),
  eventId: z.string().optional(),
  value: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { impressionId, type, conversionType, eventId, value } = AdTrackRequestSchema.parse(body);

    // Get impression
    const impression = await prisma.adImpression.findUnique({
      where: { id: impressionId },
      include: {
        clicks: true,
      },
    });

    if (!impression) {
      return NextResponse.json(
        { error: 'Impression not found' },
        { status: 404 }
      );
    }

    // Handle different tracking types
    switch (type) {
      case 'CLICK':
        await handleClick(impression);
        break;

      case 'VIEWABLE':
        await handleViewable(impression);
        break;

      case 'CONVERSION':
        if (!conversionType) {
          return NextResponse.json(
            { error: 'Conversion type required' },
            { status: 400 }
          );
        }
        await handleConversion(impression, conversionType, eventId, value);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Ad track error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleClick(impression: any) {
  // Create click record
  await prisma.adClick.create({
    data: {
      impressionId: impression.id,
    },
  });

  // Update campaign budget
  await prisma.adBudget.update({
    where: { campaignId: impression.campaignId },
    data: {
      clicks: { increment: 1 },
    },
  });

  // Log analytics event
  await prisma.analyticsEvent.create({
    data: {
      sessionId: impression.sessionId,
      userId: impression.userId,
      adCampaignId: impression.campaignId,
      adCreativeId: impression.creativeId,
      type: 'AD_CLICK',
      props: {
        slot: impression.slot,
        impressionId: impression.id,
      },
      city: impression.city,
      occurredAt: new Date(),
    },
  });
}

async function handleViewable(impression: any) {
  // Update impression viewability
  await prisma.adImpression.update({
    where: { id: impression.id },
    data: {
      viewable: true,
      viewedAt: new Date(),
    },
  });

  // Update campaign budget
  await prisma.adBudget.update({
    where: { campaignId: impression.campaignId },
    data: {
      viewable: { increment: 1 },
    },
  });

  // Log analytics event
  await prisma.analyticsEvent.create({
    data: {
      sessionId: impression.sessionId,
      userId: impression.userId,
      adCampaignId: impression.campaignId,
      adCreativeId: impression.creativeId,
      type: 'AD_VIEWABLE',
      props: {
        slot: impression.slot,
        impressionId: impression.id,
      },
      city: impression.city,
      occurredAt: new Date(),
    },
  });
}

async function handleConversion(
  impression: any,
  conversionType: 'BOOK_CLICK' | 'OUTBOUND_CLICK' | 'SAVE' | 'SHARE',
  eventId?: string,
  value?: number
) {
  const now = new Date();

  // Get most recent click (if any)
  const click = impression.clicks.length > 0
    ? impression.clicks.sort((a: any, b: any) =>
        b.occurredAt.getTime() - a.occurredAt.getTime()
      )[0]
    : null;

  // Check attribution windows
  const attribution = isWithinAttributionWindow(
    impression.occurredAt,
    now,
    click?.occurredAt || null,
    { view: 24, click: 168 } // 24h view-through, 7d click-through
  );

  if (!attribution.attributed) {
    return; // Outside attribution window
  }

  // Create conversion record
  await prisma.adConversion.create({
    data: {
      campaignId: impression.campaignId,
      impressionId: impression.id,
      clickId: click?.id || null,
      eventId: eventId || null,
      type: conversionType,
      value: value || null,
    },
  });

  // Update campaign budget
  await prisma.adBudget.update({
    where: { campaignId: impression.campaignId },
    data: {
      conversions: { increment: 1 },
    },
  });

  // Log analytics event
  await prisma.analyticsEvent.create({
    data: {
      sessionId: impression.sessionId,
      userId: impression.userId,
      adCampaignId: impression.campaignId,
      adCreativeId: impression.creativeId,
      eventId: eventId || null,
      type: 'AD_CONVERSION',
      props: {
        slot: impression.slot,
        impressionId: impression.id,
        clickId: click?.id || null,
        conversionType,
        attributionType: attribution.type,
        value,
      },
      city: impression.city,
      occurredAt: now,
    },
  });
}
