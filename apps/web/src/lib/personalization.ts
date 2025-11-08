import { cookies } from 'next/headers';
import { prisma } from '@citypass/db';

export interface UserPreferences {
  userId?: string;
  isLoggedIn: boolean;
  city: string;
  categories?: string[];
  priceMin?: number;
  priceMax?: number;
  neighborhoods?: string[];
  timeOfDay?: string;
  sessionId: string;
  firstVisit: number;
  lastVisit: number;
}

/**
 * Get user preferences from cookie and database
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  const cookieStore = await cookies();
  const prefsCookie = cookieStore.get('user_prefs');

  let prefs: UserPreferences = {
    isLoggedIn: false,
    city: 'New York',
    sessionId: crypto.randomUUID(),
    firstVisit: Date.now(),
    lastVisit: Date.now(),
  };

  // Parse cookie preferences
  if (prefsCookie?.value) {
    try {
      const cookiePrefs = JSON.parse(prefsCookie.value);
      prefs = { ...prefs, ...cookiePrefs };
    } catch (e) {
      console.error('Failed to parse user preferences cookie:', e);
    }
  }

  // If logged in, fetch from database
  if (prefs.userId && prefs.isLoggedIn) {
    try {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: prefs.userId },
      });

      if (profile) {
        prefs.city = profile.homeCity || prefs.city;
        prefs.categories = profile.favoriteCategories;
        prefs.priceMin = profile.priceMin ?? undefined;
        prefs.priceMax = profile.priceMax ?? undefined;
        prefs.neighborhoods = profile.neighborhoods;
        prefs.timeOfDay = profile.timeOfDay ?? undefined;
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
  }

  return prefs;
}

/**
 * Calculate personalized score boost for an event
 * @param event Event data
 * @param prefs User preferences
 * @returns Score multiplier (0.8 to 1.2)
 */
export function calculatePersonalizationBoost(
  event: {
    category?: string | null;
    neighborhood?: string | null;
    priceMin?: number | null;
    priceMax?: number | null;
    startTime: Date;
  },
  prefs: UserPreferences
): number {
  let boost = 1.0;

  // Category match (+10%)
  if (prefs.categories && event.category) {
    if (prefs.categories.includes(event.category)) {
      boost += 0.1;
    }
  }

  // Neighborhood match (+10%)
  if (prefs.neighborhoods && event.neighborhood) {
    if (prefs.neighborhoods.includes(event.neighborhood)) {
      boost += 0.1;
    }
  }

  // Price range match (+5%)
  if (prefs.priceMin !== undefined && prefs.priceMax !== undefined) {
    const eventPrice = event.priceMin ?? 0;
    if (eventPrice >= prefs.priceMin && eventPrice <= prefs.priceMax) {
      boost += 0.05;
    } else if (Math.abs(eventPrice - prefs.priceMax) > prefs.priceMax * 0.5) {
      // Too expensive, penalize
      boost -= 0.1;
    }
  }

  // Time of day match (+5%)
  if (prefs.timeOfDay) {
    const hour = event.startTime.getHours();
    let matchesTimePreference = false;

    switch (prefs.timeOfDay) {
      case 'morning':
        matchesTimePreference = hour >= 6 && hour < 12;
        break;
      case 'afternoon':
        matchesTimePreference = hour >= 12 && hour < 17;
        break;
      case 'evening':
        matchesTimePreference = hour >= 17 && hour < 21;
        break;
      case 'night':
        matchesTimePreference = hour >= 21 || hour < 6;
        break;
    }

    if (matchesTimePreference) {
      boost += 0.05;
    }
  }

  // Clamp between 0.8 and 1.2
  return Math.max(0.8, Math.min(1.2, boost));
}

/**
 * Log a search session
 */
export async function logSearchSession(
  query: string,
  city: string,
  filters: Record<string, any>,
  resultsCount: number,
  userId?: string
): Promise<void> {
  try {
    await prisma.searchSession.create({
      data: {
        query,
        city,
        filters,
        resultsCount,
        userId: userId || null,
      },
    });
  } catch (e) {
    console.error('Failed to log search session:', e);
  }
}
