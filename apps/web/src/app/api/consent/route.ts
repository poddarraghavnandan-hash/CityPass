/**
 * Consent Management API
 * Saves user consent preferences for analytics, personalization, and advertising
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { z } from 'zod';

const ConsentRequestSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  analytics: z.boolean(),
  personalization: z.boolean(),
  advertising: z.boolean(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId, analytics, personalization, advertising } = ConsentRequestSchema.parse(body);

    // Upsert consent record
    const consent = await prisma.userConsent.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userId: userId || null,
        analytics,
        personalization,
        advertising,
      },
      update: {
        userId: userId || null,
        analytics,
        personalization,
        advertising,
      },
    });

    return NextResponse.json({
      success: true,
      consent: {
        analytics: consent.analytics,
        personalization: consent.personalization,
        advertising: consent.advertising,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Consent save error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId required' },
        { status: 400 }
      );
    }

    const consent = await prisma.userConsent.findUnique({
      where: { sessionId },
      select: {
        analytics: true,
        personalization: true,
        advertising: true,
        createdAt: true,
      },
    });

    if (!consent) {
      return NextResponse.json({
        consent: null,
        hasConsent: false,
      });
    }

    return NextResponse.json({
      consent,
      hasConsent: true,
    });
  } catch (error) {
    console.error('Consent fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
