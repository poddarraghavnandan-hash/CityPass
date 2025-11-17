/**
 * Intent Extraction Tests
 * Tests for NLU intent parsing from free text
 */

import { describe, it, expect } from 'vitest';
import {
  extractIntentTokens,
  mapToIntentionTokens,
  buildIntentionFromText,
} from '../src/intent';

describe('extractIntentTokens', () => {
  const now = new Date('2025-01-15T14:00:00Z');

  it('should extract "tonight" as time window', () => {
    const tokens = extractIntentTokens('looking for something tonight', now);

    expect(tokens.timeWindow).toBeDefined();
    expect(tokens.timeWindow?.humanReadable).toBe('tonight (6pm-midnight)');
    expect(tokens.timeWindow?.untilMinutes).toBeGreaterThan(0);
  });

  it('should extract "this weekend" as time window', () => {
    const tokens = extractIntentTokens('plans for this weekend', now);

    expect(tokens.timeWindow).toBeDefined();
    expect(tokens.timeWindow?.humanReadable).toBe('this weekend');
  });

  it('should extract specific time "at 7pm"', () => {
    const tokens = extractIntentTokens('dinner at 7pm', now);

    expect(tokens.timeWindow).toBeDefined();
    expect(tokens.timeWindow?.humanReadable).toContain('19:00');
  });

  it('should extract location from "near Midtown"', () => {
    const tokens = extractIntentTokens('events near Midtown', now);

    expect(tokens.location).toBeDefined();
    expect(tokens.location?.query.toLowerCase()).toContain('midtown');
  });

  it('should extract location from "in Brooklyn"', () => {
    const tokens = extractIntentTokens('concerts in Brooklyn', now);

    expect(tokens.location).toBeDefined();
    expect(tokens.location?.district?.toLowerCase()).toContain('brooklyn');
  });

  it('should extract high exertion level', () => {
    const tokens = extractIntentTokens('strenuous workout class', now);

    expect(tokens.exertion).toBe('high');
  });

  it('should extract moderate exertion level', () => {
    const tokens = extractIntentTokens('active but fun', now);

    expect(tokens.exertion).toBe('moderate');
  });

  it('should extract low exertion level', () => {
    const tokens = extractIntentTokens('relaxing evening', now);

    expect(tokens.exertion).toBe('low');
  });

  it('should extract electric vibe', () => {
    const tokens = extractIntentTokens('electric atmosphere', now);

    expect(tokens.vibe).toBe('electric');
  });

  it('should extract calm vibe', () => {
    const tokens = extractIntentTokens('calm and peaceful', now);

    expect(tokens.vibe).toBe('calm');
  });

  it('should extract companions', () => {
    const tokens = extractIntentTokens('date night with friends', now);

    expect(tokens.companions).toBeDefined();
    expect(tokens.companions).toContain('date');
    expect(tokens.companions).toContain('friends');
  });

  it('should extract free budget', () => {
    const tokens = extractIntentTokens('free events only', now);

    expect(tokens.budget).toBe('free');
  });

  it('should extract casual budget from price', () => {
    const tokens = extractIntentTokens('under $30', now);

    expect(tokens.budget).toBe('casual');
  });

  it('should extract splurge budget', () => {
    const tokens = extractIntentTokens('splurge worthy experience', now);

    expect(tokens.budget).toBe('splurge');
  });

  it('should extract walking travel mode', () => {
    const tokens = extractIntentTokens('walking distance', now);

    expect(tokens.travelMode).toBe('walk');
  });

  it('should extract transit travel mode', () => {
    const tokens = extractIntentTokens('subway accessible', now);

    expect(tokens.travelMode).toBe('transit');
  });

  it('should handle complex query with multiple tokens', () => {
    const tokens = extractIntentTokens(
      'Looking for electric music events near Brooklyn tonight, free or under $20, with friends',
      now
    );

    expect(tokens.timeWindow?.humanReadable).toBe('tonight (6pm-midnight)');
    expect(tokens.location?.query.toLowerCase()).toContain('brooklyn');
    expect(tokens.vibe).toBe('electric');
    expect(tokens.companions).toContain('friends');
    expect(tokens.budget).toBeDefined();
  });
});

describe('mapToIntentionTokens', () => {
  it('should map vibe to mood', () => {
    const extracted = { vibe: 'electric' };
    const mapped = mapToIntentionTokens(extracted);

    expect(mapped.mood).toBe('electric');
  });

  it('should map timeWindow to untilMinutes', () => {
    const extracted = {
      timeWindow: {
        fromMinutes: 0,
        untilMinutes: 180,
        humanReadable: 'next 3 hours',
      },
    };
    const mapped = mapToIntentionTokens(extracted);

    expect(mapped.untilMinutes).toBe(180);
  });

  it('should map travelMode to distanceKm', () => {
    const extracted = { travelMode: 'walk' as const };
    const mapped = mapToIntentionTokens(extracted);

    expect(mapped.distanceKm).toBe(2);
  });

  it('should preserve base tokens', () => {
    const extracted = { vibe: 'electric' };
    const baseTokens = { mood: 'calm' as const, budget: 'casual' as const };
    const mapped = mapToIntentionTokens(extracted, baseTokens);

    expect(mapped.mood).toBe('electric'); // Overridden
    expect(mapped.budget).toBe('casual'); // Preserved
  });
});

describe('buildIntentionFromText', () => {
  it('should build intention from free text', async () => {
    const input = {
      freeText: 'electric music events tonight near Brooklyn',
      city: 'New York',
    };

    const intention = await buildIntentionFromText(input);

    expect(intention.city).toBe('New York');
    expect(intention.tokens.mood).toBe('electric');
    expect(intention.nowISO).toBeDefined();
  });

  it('should use default city when not provided', async () => {
    const input = {
      freeText: 'concerts tonight',
    };

    const intention = await buildIntentionFromText(input);

    expect(intention.city).toBeDefined();
  });
});
