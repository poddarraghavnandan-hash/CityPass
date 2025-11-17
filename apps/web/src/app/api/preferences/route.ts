import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { prisma } from '@citypass/db';
import { PreferencesSchema, parsePreferencesCookie } from '@/lib/preferences';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const COOKIE_KEY = 'citylens_prefs';

/**
 * GET /api/preferences
 * Retrieve user preferences
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(COOKIE_KEY)?.value;
    const preferences = parsePreferencesCookie(raw);
    const session = await getServerSession(authOptions);
    const userId = session?.user && 'id' in session.user ? (session.user as any).id : undefined;

    if (userId) {
      const profile = await prisma.userProfile.findUnique({ where: { userId } });
      if (profile?.meta) {
        try {
          const merged = { ...preferences, ...profile.meta };
          const parsedDbPrefs = parsePreferencesCookie(JSON.stringify(merged));
          if (parsedDbPrefs) {
            return NextResponse.json({
              preferences: parsedDbPrefs,
              hasPreferences: true,
            });
          }
        } catch (err) {
          console.warn('Failed to merge DB profile prefs', err);
        }
      }
    }

    if (!preferences) {
      return NextResponse.json({
        preferences: null,
        hasPreferences: false,
      });
    }

    return NextResponse.json({
      preferences,
      hasPreferences: true,
    });
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
    const payload = await req.json();
    const parsed = PreferencesSchema.parse(payload);
    const session = await getServerSession(authOptions);
    const userId = session?.user && 'id' in session.user ? (session.user as any).id : undefined;

    const response = NextResponse.json({
      success: true,
      preferences: parsed,
    });

    if (userId) {
      await prisma.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          favoriteCategories: parsed.interests,
          meta: parsed,
        },
        update: {
          favoriteCategories: parsed.interests,
          meta: parsed,
          lastSeenAt: new Date(),
        },
      });
    }

    response.cookies.set(COOKIE_KEY, JSON.stringify(parsed), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Preferences save error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid preferences payload', issues: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
