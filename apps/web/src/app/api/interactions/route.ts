import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { cookies } from 'next/headers';

interface InteractionPayload {
  eventId: string;
  type: 'VIEW' | 'LIKE' | 'DISLIKE' | 'SAVE' | 'SHARE' | 'BOOK_CLICK';
  dwellTimeMs?: number;
  metadata?: Record<string, any>;
}

/**
 * POST /api/interactions
 * Track user interactions with events for ML training
 */
export async function POST(req: NextRequest) {
  try {
    const body: InteractionPayload = await req.json();
    const { eventId, type, dwellTimeMs, metadata } = body;

    if (!eventId || !type) {
      return NextResponse.json(
        { error: 'eventId and type are required' },
        { status: 400 }
      );
    }

    // Get or create session ID
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('session_id')?.value;

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get user profile if exists (commented out until UserProfile has sessionId)
    // const profile = await prisma.userProfile.findFirst({
    //   where: { sessionId },
    // });
    // Temporary: UserProfile doesn't have sessionId field yet

    // Create analytics event
    await prisma.analyticsEvent.create({
      data: {
        type: type as any,
        sessionId,
        userId: null, // profile?.userId || null,
        eventId,
        props: metadata || {}, // Store metadata in props field
        occurredAt: new Date(),
      },
    });

    // Update event interaction counts
    const updateData: any = {};
    switch (type) {
      case 'VIEW':
        updateData.viewCount = { increment: 1 };
        updateData.viewCount24h = { increment: 1 };
        break;
      case 'SAVE':
        updateData.saveCount = { increment: 1 };
        updateData.saveCount24h = { increment: 1 };
        break;
      case 'SHARE':
        updateData.shareCount = { increment: 1 };
        break;
      case 'BOOK_CLICK':
        updateData.clickCount = { increment: 1 };
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.event.update({
        where: { id: eventId },
        data: updateData,
      });
    }

    // Update user preferences based on interaction
    if (sessionId) {
      try {
        // 1. Get or create user persona (uses Cache + DB)
        // Note: We need userId to persist to DB currently, but getOrCreate handles session-only too
        const { getOrCreateUserPersona, saveUserPersona, updatePersonaFromInteraction } = await import('@citypass/llm');

        // Get userId from profile if we can find it (legacy lookup)
        let userId: string | undefined;
        // Temporary lookup until we have better session management
        // const profile = await prisma.userProfile.findFirst({ where: { sessionId } });
        // if (profile) userId = profile.userId;

        const persona = await getOrCreateUserPersona(sessionId, userId);

        // 2. Fetch event details for the interaction
        const event = await prisma.event.findUnique({
          where: { id: eventId },
          select: {
            category: true,
            city: true,
            venueName: true,
            neighborhood: true,
            priceMin: true,
            tags: true
          },
        });

        if (event) {
          // 3. Update persona
          const updatedPersona = await updatePersonaFromInteraction(persona, {
            type,
            eventId,
            event: {
              category: event.category || 'OTHER',
              city: event.city,
              venueName: event.venueName || undefined,
              neighborhood: event.neighborhood || undefined,
              priceMin: event.priceMin || undefined,
              tags: event.tags,
            },
            dwellTimeMs,
            timestamp: new Date(),
          });

          // 4. Save back (uses Cache + DB)
          await saveUserPersona(updatedPersona);
        }
      } catch (err) {
        console.error('Failed to update personalization:', err);
        // Don't fail the request
      }
    }

    // Set cookie if new session
    const response = NextResponse.json({ success: true });
    if (!cookieStore.get('session_id')?.value) {
      response.cookies.set('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return response;
  } catch (error: any) {
    console.error('Interaction tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/interactions
 * Get user's interaction history (for personalization)
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    if (!sessionId) {
      return NextResponse.json({
        interactions: [],
        total: 0,
      });
    }

    const interactions = await prisma.analyticsEvent.findMany({
      where: {
        sessionId,
        type: { in: ['VIEW', 'SAVE', 'SHARE', 'BOOK_CLICK'] as any[] },
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
      // AnalyticsEvent doesn't have relation to Event
      // include: {
      //   event: {
      //     select: {
      //       id: true,
      //       title: true,
      //       category: true,
      //       imageUrl: true,
      //     },
      //   },
      // },
    });

    return NextResponse.json({
      interactions: interactions.map(i => ({
        id: i.id,
        type: i.type,
        eventId: i.eventId, // Changed from i.event since Event relation doesn't exist
        occurredAt: i.occurredAt,
      })),
      total: interactions.length,
    });
  } catch (error: any) {
    console.error('Interaction fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
