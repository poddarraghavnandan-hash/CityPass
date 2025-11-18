/**
 * Advanced NLU Intent Extraction
 * Extracts structured tokens from free-text queries using pattern matching and LLM
 */

import type { IntentionTokens } from '@citypass/types';
import { buildIntention, type IntentionOptions } from './intention';

export interface IntentParserInput {
  freeText: string;
  city?: string;
  userId?: string;
}

interface ExtractedTokens {
  timeWindow?: {
    fromMinutes: number;
    untilMinutes: number;
    humanReadable: string;
  };
  location?: {
    query: string;
    district?: string;
    lat?: number;
    lon?: number;
  };
  exertion?: 'low' | 'moderate' | 'high';
  vibe?: string; // Maps to mood
  companions?: IntentionTokens['companions'];
  budget?: 'free' | 'casual' | 'splurge';
  travelMode?: 'walk' | 'bike' | 'transit' | 'drive';
}

/**
 * Extract time window from free text
 * Examples:
 *  - "tonight" -> 18:00-23:59 today
 *  - "this weekend" -> Friday 18:00 - Sunday 23:59
 *  - "next Tuesday at 7pm" -> Tuesday 19:00
 *  - "in 2 hours" -> now + 2h
 */
function extractTimeWindow(text: string, now: Date = new Date()): ExtractedTokens['timeWindow'] {
  const lower = text.toLowerCase();

  // Tonight: 6pm - midnight
  if (/\btonight\b/.test(lower)) {
    const today = new Date(now);
    today.setHours(18, 0, 0, 0);
    const fromMinutes = Math.max(0, (today.getTime() - now.getTime()) / 60000);

    return {
      fromMinutes: Math.round(fromMinutes),
      untilMinutes: Math.round(fromMinutes + 6 * 60), // 6 hours
      humanReadable: 'tonight (6pm-midnight)',
    };
  }

  // Today: until midnight tonight (rest of the day)
  if (/\btoday\b/.test(lower)) {
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const untilMinutes = Math.max(0, (endOfDay.getTime() - now.getTime()) / 60000);

    return {
      fromMinutes: 0,
      untilMinutes: Math.round(untilMinutes),
      humanReadable: 'today',
    };
  }

  // Tomorrow: all day tomorrow
  if (/\btomorrow\b/.test(lower)) {
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(now.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const fromMinutes = Math.max(0, (tomorrowStart.getTime() - now.getTime()) / 60000);
    const untilMinutes = Math.max(0, (tomorrowEnd.getTime() - now.getTime()) / 60000);

    return {
      fromMinutes: Math.round(fromMinutes),
      untilMinutes: Math.round(untilMinutes),
      humanReadable: 'tomorrow',
    };
  }

  // This weekend: Friday 6pm - Sunday 11:59pm
  if (/\b(this\s+)?weekend\b/.test(lower)) {
    const dayOfWeek = now.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
    const friday = new Date(now);
    friday.setDate(now.getDate() + daysUntilFriday);
    friday.setHours(18, 0, 0, 0);

    const sunday = new Date(friday);
    sunday.setDate(friday.getDate() + 2);
    sunday.setHours(23, 59, 59, 999);

    const fromMinutes = Math.max(0, (friday.getTime() - now.getTime()) / 60000);
    const untilMinutes = Math.max(0, (sunday.getTime() - now.getTime()) / 60000);

    return {
      fromMinutes: Math.round(fromMinutes),
      untilMinutes: Math.round(untilMinutes),
      humanReadable: 'this weekend',
    };
  }

  // Specific time: "at 6pm", "at 7:30"
  const timeMatch = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const isPM = timeMatch[3] === 'pm' || (!timeMatch[3] && hours >= 6 && hours <= 11);

    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    const targetTime = new Date(now);
    targetTime.setHours(hours, minutes, 0, 0);

    // If target time is in the past today, assume tomorrow
    if (targetTime < now) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const fromMinutes = Math.round((targetTime.getTime() - now.getTime()) / 60000);

    return {
      fromMinutes: Math.max(0, fromMinutes),
      untilMinutes: Math.max(0, fromMinutes + 120), // 2 hours after
      humanReadable: `at ${hours}:${minutes.toString().padStart(2, '0')}`,
    };
  }

  // Relative time: "in 2 hours", "in 30 minutes"
  const relativeMatch = lower.match(/\bin\s+(\d+)\s+(hour|minute|hr|min)/);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2];
    const minutes = unit.startsWith('hour') || unit === 'hr' ? amount * 60 : amount;

    return {
      fromMinutes: minutes,
      untilMinutes: minutes + 120,
      humanReadable: `in ${amount} ${unit}${amount > 1 ? 's' : ''}`,
    };
  }

  // Default: next 3 hours
  return {
    fromMinutes: 0,
    untilMinutes: 180,
    humanReadable: 'next 3 hours',
  };
}

/**
 * Extract location/place from free text
 * Examples:
 *  - "near Midtown" -> { query: "Midtown" }
 *  - "in Brooklyn" -> { district: "Brooklyn" }
 *  - "downtown" -> { district: "Downtown" }
 */
function extractLocation(text: string): ExtractedTokens['location'] {
  const lower = text.toLowerCase();

  // "near X", "in X", "around X"
  const nearMatch = lower.match(/\b(near|in|around|at)\s+([a-z\s]+?)(?:\s|,|$)/i);
  if (nearMatch) {
    const location = nearMatch[2].trim();
    return {
      query: location,
      district: location,
    };
  }

  // Known districts/neighborhoods
  const districts = [
    'downtown', 'midtown', 'uptown', 'brooklyn', 'queens', 'bronx',
    'manhattan', 'soho', 'tribeca', 'williamsburg', 'bushwick',
  ];

  for (const district of districts) {
    if (lower.includes(district)) {
      return {
        query: district,
        district: district.charAt(0).toUpperCase() + district.slice(1),
      };
    }
  }

  return undefined;
}

/**
 * Extract exertion level from free text
 * Examples:
 *  - "strenuous" -> high
 *  - "relaxing" -> low
 *  - "active but fun" -> moderate
 */
function extractExertion(text: string): ExtractedTokens['exertion'] {
  const lower = text.toLowerCase();

  // High exertion keywords
  if (
    /\b(strenuous|intense|vigorous|demanding|challenging|hard\s*core|athletic)\b/.test(
      lower
    )
  ) {
    return 'high';
  }

  // Moderate exertion keywords
  if (
    /\b(active|moderate|exercise|workout|physical|dance|bike|hike)\b/.test(
      lower
    )
  ) {
    return 'moderate';
  }

  // Low exertion keywords
  if (
    /\b(relaxing|calm|chill|easy|gentle|light|casual|sit|seated)\b/.test(
      lower
    )
  ) {
    return 'low';
  }

  return undefined;
}

/**
 * Extract vibe/mood from free text
 * Examples:
 *  - "electric atmosphere" -> electric
 *  - "calm and peaceful" -> calm
 *  - "social vibes" -> social
 */
function extractVibe(text: string): string | undefined {
  const lower = text.toLowerCase();

  const vibeMap: Record<string, RegExp> = {
    electric: /\b(electric|energetic|lively|upbeat|vibrant|exciting)\b/,
    calm: /\b(calm|peaceful|relaxing|zen|tranquil|serene|quiet)\b/,
    social: /\b(social|networking|meet\s*people|friends|group)\b/,
    artistic: /\b(artistic|creative|artsy|cultural|intellectual)\b/,
    grounded: /\b(grounded|authentic|real|down\s*to\s*earth|genuine)\b/,
  };

  for (const [vibe, pattern] of Object.entries(vibeMap)) {
    if (pattern.test(lower)) {
      return vibe;
    }
  }

  return undefined;
}

/**
 * Extract companions from free text
 * Examples:
 *  - "with friends" -> ['friends']
 *  - "date night" -> ['date']
 *  - "family friendly" -> ['family']
 */
function extractCompanions(text: string): IntentionTokens['companions'] | undefined {
  const lower = text.toLowerCase();
  const companions: IntentionTokens['companions'] = [];

  if (/\b(solo|alone|myself)\b/.test(lower)) companions.push('solo');
  if (/\b(friends|crew|squad)\b/.test(lower)) companions.push('crew');
  if (/\b(date|partner|significant\s*other)\b/.test(lower)) companions.push('partner');
  if (/\b(family|kids|children)\b/.test(lower)) companions.push('family');

  return companions.length > 0 ? companions : undefined;
}

/**
 * Extract budget from free text
 * Examples:
 *  - "free events" -> free
 *  - "under $30" -> casual
 *  - "splurge worthy" -> splurge
 */
function extractBudget(text: string): ExtractedTokens['budget'] {
  const lower = text.toLowerCase();

  if (/\b(free|no\s*cost|gratis|zero\s*dollar)\b/.test(lower)) {
    return 'free';
  }

  if (/\b(splurge|expensive|fancy|upscale|luxury|premium)\b/.test(lower)) {
    return 'splurge';
  }

  // Check for price mentions
  const priceMatch = lower.match(/\$(\d+)/);
  if (priceMatch) {
    const price = parseInt(priceMatch[1]);
    if (price === 0) return 'free';
    if (price > 100) return 'splurge';
    return 'casual';
  }

  if (/\b(affordable|budget|cheap|inexpensive|casual)\b/.test(lower)) {
    return 'casual';
  }

  return undefined;
}

/**
 * Extract travel mode from free text
 * Examples:
 *  - "walking distance" -> walk
 *  - "bike friendly" -> bike
 *  - "subway accessible" -> transit
 */
function extractTravelMode(text: string): ExtractedTokens['travelMode'] {
  const lower = text.toLowerCase();

  if (/\b(walk|walking|walkable|on\s*foot)\b/.test(lower)) return 'walk';
  if (/\b(bike|biking|bicycle|cycling)\b/.test(lower)) return 'bike';
  if (/\b(subway|train|transit|metro|bus|public\s*transport)\b/.test(lower)) return 'transit';
  if (/\b(drive|driving|car|parking)\b/.test(lower)) return 'drive';

  return undefined;
}

/**
 * Extract structured tokens from free text
 */
export function extractIntentTokens(
  freeText: string,
  now: Date = new Date()
): ExtractedTokens {
  const tokens: ExtractedTokens = {};

  // Extract each component
  tokens.timeWindow = extractTimeWindow(freeText, now);
  tokens.location = extractLocation(freeText);
  tokens.exertion = extractExertion(freeText);
  tokens.vibe = extractVibe(freeText);
  tokens.companions = extractCompanions(freeText);
  tokens.budget = extractBudget(freeText);
  tokens.travelMode = extractTravelMode(freeText);

  return tokens;
}

/**
 * Map extracted tokens to IntentionTokens
 */
export function mapToIntentionTokens(
  extracted: ExtractedTokens,
  baseTokens?: Partial<IntentionTokens>
): Partial<IntentionTokens> {
  const mapped: Partial<IntentionTokens> = { ...baseTokens };

  // Time window
  if (extracted.timeWindow) {
    mapped.untilMinutes = extracted.timeWindow.untilMinutes;
  }

  // Vibe/mood
  if (extracted.vibe) {
    mapped.mood = extracted.vibe as IntentionTokens['mood'];
  }

  // Companions
  if (extracted.companions) {
    mapped.companions = extracted.companions as IntentionTokens['companions'];
  }

  // Budget
  if (extracted.budget) {
    mapped.budget = extracted.budget;
  }

  // Travel mode influences distance
  if (extracted.travelMode) {
    const distanceMap: Record<string, number> = {
      walk: 2,
      bike: 5,
      transit: 10,
      drive: 20,
    };
    mapped.distanceKm = distanceMap[extracted.travelMode];
  }

  return mapped;
}

/**
 * Build intention from free text using NLU
 */
export async function buildIntentionFromText(
  input: IntentParserInput,
  options: IntentionOptions = {}
): Promise<ReturnType<typeof buildIntention>> {
  const extracted = extractIntentTokens(input.freeText);
  const mappedTokens = mapToIntentionTokens(extracted, options.overrides);

  const intention = buildIntention({
    ...options,
    city: input.city || options.city,
    userId: input.userId || options.userId,
    overrides: mappedTokens,
  });

  return intention;
}
