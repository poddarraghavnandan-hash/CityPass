import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { cookies } from 'next/headers';

interface PreferencesPayload {
  favoriteCategories: string[];
  pricePreference: string;
  timePreference: string;
  groupSize: string;
  discoveryMode: string;
}

/**
 * GET /api/preferences
 * Retrieve user preferences
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session_id')?.value;

    if (!sessionId) {
      return NextResponse.json({
        preferences: null,
        hasPreferences: false,
      });
    }

    // Try to find existing preferences (commented out - sessionId field doesn't exist in UserProfile)
    const profile = null; // TODO: Fix when UserProfile has sessionId field
    // const profile = await prisma.userProfile.findFirst({
    //   where: { sessionId },
    // });

    // Always return no preferences since profile lookup is disabled
    return NextResponse.json({
      preferences: null,
      hasPreferences: false,
    });

    // Commented out until UserProfile has sessionId field
    // if (!profile) {
    //   return NextResponse.json({
    //     preferences: null,
    //     hasPreferences: false,
    //   });
    // }

    // return NextResponse.json({
    //   preferences: {
    //     favoriteCategories: profile.favoriteCategories,
    //     pricePreference: profile.pricePreference,
    //     timePreference: profile.timePreference,
    //     groupSize: profile.groupSize,
    //     discoveryMode: profile.discoveryMode,
    //   },
    //   hasPreferences: true,
    // });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/preferences
 * Save or update user preferences
 */
export async function POST(req: NextRequest) {
  try {
    const body: PreferencesPayload = await req.json();

    const { favoriteCategories, pricePreference, timePreference, groupSize, discoveryMode } = body;

    // Validate input
    if (!favoriteCategories || !Array.isArray(favoriteCategories)) {
      return NextResponse.json(
        { error: 'favoriteCategories is required and must be an array' },
        { status: 400 }
      );
    }

    // Get or create session ID
    const cookieStore = await cookies();
    let sessionId = cookieStore.get('session_id')?.value;

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Create or update user profile - TODO: Re-enable when UserProfile has sessionId
    // Temporary: Just return success without saving
    const profile = {
      favoriteCategories,
      pricePreference,
      timePreference,
      groupSize,
      discoveryMode,
    };
    // const profile = await prisma.userProfile.upsert({
    //   where: { sessionId },
    //   create: {
    //     sessionId,
    //     favoriteCategories,
    //     pricePreference,
    //     timePreference,
    //     groupSize,
    //     discoveryMode,
    //     userId: null, // Will be linked when user signs up
    //   },
    //   update: {
    //     favoriteCategories,
    //     pricePreference,
    //     timePreference,
    //     groupSize,
    //     discoveryMode,
    //   },
    // });

    // Set cookie
    const response = NextResponse.json({
      success: true,
      preferences: {
        favoriteCategories: profile.favoriteCategories,
        pricePreference: profile.pricePreference,
        timePreference: profile.timePreference,
        groupSize: profile.groupSize,
        discoveryMode: profile.discoveryMode,
      },
    });

    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error) {
    console.error('Preferences save error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
