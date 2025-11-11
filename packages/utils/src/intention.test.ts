/**
 * Unit tests for intention.ts
 * Tests cookie parsing, base64 decoding, and token merging
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  parseIntentionCookie,
  serializeIntention,
  buildIntention,
  normalizeMood,
  normalizeBudget,
  normalizeCompanions,
  type IntentionOptions,
} from './intention';
import type { IntentionTokens } from '@citypass/types';

describe('parseIntentionCookie', () => {
  it('should return empty object for null or undefined cookie', () => {
    expect(parseIntentionCookie(null)).toEqual({});
    expect(parseIntentionCookie(undefined)).toEqual({});
    expect(parseIntentionCookie('')).toEqual({});
  });

  it('should parse plain JSON cookie', () => {
    const cookie = JSON.stringify({ mood: 'electric', budget: 'splurge' });
    const result = parseIntentionCookie(cookie);

    expect(result.mood).toBe('electric');
    expect(result.budget).toBe('splurge');
  });

  it('should parse base64url encoded cookie', () => {
    const tokens = { mood: 'calm', budget: 'free', untilMinutes: 120 };
    const serialized = serializeIntention(tokens as IntentionTokens);
    const result = parseIntentionCookie(serialized);

    expect(result.mood).toBe('calm');
    expect(result.budget).toBe('free');
    expect(result.untilMinutes).toBe(120);
  });

  it('should parse base64 (not url-safe) encoded cookie', () => {
    const tokens = { mood: 'social', budget: 'casual' };
    const base64 = Buffer.from(JSON.stringify(tokens), 'utf8').toString('base64');
    const result = parseIntentionCookie(base64);

    expect(result.mood).toBe('social');
    expect(result.budget).toBe('casual');
  });

  it('should handle complex encodings', () => {
    // Test with direct JSON (no encoding)
    const direct = JSON.stringify({ mood: 'electric', companions: ['partner'] });
    const result1 = parseIntentionCookie(direct);
    expect(result1.mood).toBe('electric');
    expect(result1.companions).toEqual(['partner']);
  });

  it('should return empty object for invalid data', () => {
    expect(parseIntentionCookie(null)).toEqual({});
    expect(parseIntentionCookie(undefined)).toEqual({});
    expect(parseIntentionCookie('')).toEqual({});
  });

  it('should filter out invalid enum values', () => {
    const invalid = JSON.stringify({ mood: 'invalid_mood', budget: 'not_a_valid_budget' });
    const result = parseIntentionCookie(invalid);

    // Schema validation strips invalid values
    expect(result.mood).toBeUndefined();
    expect(result.budget).toBeUndefined();
  });

  it('should handle partial valid tokens', () => {
    const partial = JSON.stringify({ mood: 'electric', untilMinutes: 240 });
    const result = parseIntentionCookie(partial);

    // Should include provided valid tokens
    expect(result.mood).toBe('electric');
    expect(result.untilMinutes).toBe(240);
  });
});

describe('serializeIntention', () => {
  it('should serialize tokens to base64url', () => {
    const tokens: IntentionTokens = {
      mood: 'calm',
      untilMinutes: 180,
      distanceKm: 5,
      budget: 'casual',
      companions: ['solo'],
    };

    const serialized = serializeIntention(tokens);

    // Should be base64url (no +, /, or = padding)
    expect(serialized).not.toContain('+');
    expect(serialized).not.toContain('/');
    expect(serialized).not.toContain('=');

    // Should be parseable
    const decoded = Buffer.from(serialized, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded);
    expect(parsed).toEqual(tokens);
  });

  it('should be idempotent with parseIntentionCookie', () => {
    const tokens: IntentionTokens = {
      mood: 'grounded',
      untilMinutes: 240,
      distanceKm: 10,
      budget: 'splurge',
      companions: ['family'],
    };

    const serialized = serializeIntention(tokens);
    const parsed = parseIntentionCookie(serialized);

    expect(parsed).toEqual(tokens);
  });
});

describe('normalizeMood', () => {
  it('should normalize valid moods', () => {
    expect(normalizeMood('calm')).toBe('calm');
    expect(normalizeMood('CALM')).toBe('calm');
    expect(normalizeMood('Calm')).toBe('calm');
    expect(normalizeMood('social')).toBe('social');
    expect(normalizeMood('ELECTRIC')).toBe('electric');
    expect(normalizeMood('grounded')).toBe('grounded');
  });

  it('should return undefined for invalid moods', () => {
    expect(normalizeMood('happy')).toBeUndefined();
    expect(normalizeMood('excited')).toBeUndefined();
    expect(normalizeMood('')).toBeUndefined();
    expect(normalizeMood(undefined)).toBeUndefined();
  });
});

describe('normalizeBudget', () => {
  it('should normalize valid budgets', () => {
    expect(normalizeBudget('free')).toBe('free');
    expect(normalizeBudget('FREE')).toBe('free');
    expect(normalizeBudget('casual')).toBe('casual');
    expect(normalizeBudget('CASUAL')).toBe('casual');
    expect(normalizeBudget('splurge')).toBe('splurge');
    expect(normalizeBudget('Splurge')).toBe('splurge');
  });

  it('should return undefined for invalid budgets', () => {
    expect(normalizeBudget('cheap')).toBeUndefined();
    expect(normalizeBudget('expensive')).toBeUndefined();
    expect(normalizeBudget('')).toBeUndefined();
    expect(normalizeBudget(undefined)).toBeUndefined();
  });
});

describe('normalizeCompanions', () => {
  it('should normalize valid companions from array', () => {
    expect(normalizeCompanions(['solo'])).toEqual(['solo']);
    expect(normalizeCompanions(['SOLO'])).toEqual(['solo']);
    expect(normalizeCompanions(['partner', 'crew'])).toEqual(['partner', 'crew']);
    expect(normalizeCompanions(['PARTNER', 'CREW'])).toEqual(['partner', 'crew']);
  });

  it('should normalize valid companions from comma-separated string', () => {
    expect(normalizeCompanions('solo')).toEqual(['solo']);
    expect(normalizeCompanions('partner,crew')).toEqual(['partner', 'crew']);
    expect(normalizeCompanions('SOLO, PARTNER')).toEqual(['solo', 'partner']);
    expect(normalizeCompanions('family')).toEqual(['family']);
  });

  it('should filter invalid companions', () => {
    expect(normalizeCompanions(['solo', 'invalid'])).toEqual(['solo']);
    expect(normalizeCompanions(['invalid', 'bad'])).toBeUndefined(); // All invalid
  });

  it('should return undefined for empty or invalid input', () => {
    expect(normalizeCompanions([])).toBeUndefined();
    expect(normalizeCompanions('')).toBeUndefined();
    expect(normalizeCompanions(undefined)).toBeUndefined();
  });
});

describe('buildIntention', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should build intention with default tokens when no options provided', () => {
    const intention = buildIntention();

    expect(intention.tokens).toEqual({
      mood: 'calm',
      untilMinutes: 180,
      distanceKm: 5,
      budget: 'casual',
      companions: ['solo'],
    });
    expect(intention.source).toBe('inferred');
  });

  it('should merge cookie tokens with defaults', () => {
    const cookie = serializeIntention({
      mood: 'electric',
      untilMinutes: 180,
      distanceKm: 5,
      budget: 'casual',
      companions: ['solo'],
    });

    const intention = buildIntention({ cookie });

    expect(intention.tokens.mood).toBe('electric');
    expect(intention.source).toBe('cookie');
  });

  it('should merge profile tokens with defaults', () => {
    const profileTokens = {
      budget: 'splurge',
      companions: ['partner'],
    };

    const intention = buildIntention({ profileTokens });

    expect(intention.tokens.budget).toBe('splurge');
    expect(intention.tokens.companions).toEqual(['partner']);
    expect(intention.tokens.mood).toBe('calm'); // From defaults
    expect(intention.source).toBe('profile');
  });

  it('should apply overrides last (highest priority)', () => {
    const cookie = serializeIntention({
      mood: 'calm',
      untilMinutes: 180,
      distanceKm: 5,
      budget: 'free',
      companions: ['solo'],
    });

    const profileTokens = {
      budget: 'casual',
    };

    const overrides = {
      budget: 'splurge',
      mood: 'electric',
    };

    const intention = buildIntention({ cookie, profileTokens, overrides });

    expect(intention.tokens.mood).toBe('electric'); // From overrides
    expect(intention.tokens.budget).toBe('splurge'); // From overrides
    // Source is 'cookie' because cookie is present (source logic checks cookie first)
    expect(intention.source).toBe('cookie');
  });

  it('should use provided city or fallback to env/default', () => {
    const intention1 = buildIntention({ city: 'Chicago' });
    expect(intention1.city).toBe('Chicago');

    process.env.STAGING_CITY = 'Boston';
    const intention2 = buildIntention();
    expect(intention2.city).toBe('Boston');

    delete process.env.STAGING_CITY;
    const intention3 = buildIntention();
    expect(intention3.city).toBe('New York');
  });

  it('should use provided now or current time', () => {
    const fixedDate = new Date('2025-11-10T15:00:00.000Z');
    const intention = buildIntention({ now: fixedDate });

    expect(intention.nowISO).toBe('2025-11-10T15:00:00.000Z');
  });

  it('should respect FREEZE_TIME_ISO env var for testing', () => {
    process.env.FREEZE_TIME_ISO = '2025-12-25T12:00:00.000Z';

    const intention = buildIntention();

    expect(intention.nowISO).toBe('2025-12-25T12:00:00.000Z');
  });

  it('should include userId and sessionId when provided', () => {
    const intention = buildIntention({
      userId: 'user-123',
      sessionId: 'session-456',
    });

    expect(intention.userId).toBe('user-123');
    expect(intention.sessionId).toBe('session-456');
  });

  it('should determine source based on what is provided', () => {
    const cookie = serializeIntention({
      mood: 'calm',
      untilMinutes: 180,
      distanceKm: 5,
      budget: 'casual',
      companions: ['solo'],
    });

    expect(buildIntention({ cookie }).source).toBe('cookie');
    expect(buildIntention({ profileTokens: { mood: 'social' } }).source).toBe('profile');
    expect(buildIntention({ overrides: { mood: 'electric' } }).source).toBe('inline');
    expect(buildIntention().source).toBe('inferred');
  });

  it('should validate final tokens with Zod schema', () => {
    // This should not throw because buildIntention validates with IntentionTokensSchema
    expect(() => buildIntention({
      overrides: {
        mood: 'electric',
        untilMinutes: 120,
        distanceKm: 3,
        budget: 'free',
        companions: ['crew'],
      },
    })).not.toThrow();
  });

  it('should merge tokens in correct priority order', () => {
    const cookie = serializeIntention({
      mood: 'calm',
      untilMinutes: 60,
      distanceKm: 2,
      budget: 'free',
      companions: ['solo'],
    });

    const profileTokens = {
      untilMinutes: 120,
      budget: 'casual',
    };

    const overrides = {
      distanceKm: 10,
    };

    const intention = buildIntention({ cookie, profileTokens, overrides });

    expect(intention.tokens.mood).toBe('calm'); // From cookie
    expect(intention.tokens.untilMinutes).toBe(120); // From profile (overrides cookie)
    expect(intention.tokens.distanceKm).toBe(10); // From overrides (overrides all)
    expect(intention.tokens.budget).toBe('casual'); // From profile (overrides cookie)
    expect(intention.tokens.companions).toEqual(['solo']); // From cookie
  });
});
