import { NextRequest } from 'next/server';
import { describe, it, expect, beforeAll } from '@jest/globals';
import { POST as recommendHandler } from '@/app/api/lens/recommend/route';
import type { IntentionTokens } from '@citypass/types/lens';
import { requireEnv } from '../helpers/env';

const REQUIRED_ENV = [
  'DATABASE_URL',
  'TYPESENSE_HOST',
  'TYPESENSE_API_KEY',
  'QDRANT_URL',
];

function buildRequest(tokens: IntentionTokens, ids?: string[]) {
  const payload = {
    intention: {
      city: process.env.STAGING_CITY || 'New York',
      tokens,
    },
    ids,
    page: 1,
  };

  return new NextRequest('http://localhost/api/lens/recommend', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  });
}

describe('CityLens recommend API', () => {
  let shouldRun = true;

  beforeAll(() => {
    shouldRun = requireEnv(REQUIRED_ENV, 'CityLens recommend');
  });

  it('returns ranked items with reasons and sponsor gating', async () => {
    if (!shouldRun) {
      return;
    }

    const tokens: IntentionTokens = {
      mood: 'electric',
      untilMinutes: 180,
      distanceKm: 5,
      budget: 'casual',
      companions: ['crew'],
    };

    const ids = process.env.STAGING_STABLE_EVENT_IDS?.split(',').map((id) => id.trim()).filter(Boolean);
    const response = await recommendHandler(buildRequest(tokens, ids && ids.length > 0 ? ids : undefined));
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.items.length).toBeGreaterThan(0);

    payload.items.forEach((item: any) => {
      expect(item).toHaveProperty('fitScore');
      expect(item.reasons.length).toBeGreaterThan(0);
      expect(typeof item.startTime).toBe('string');
    });

    const sponsored = payload.items.filter((item: any) => item.sponsored);
    sponsored.forEach((item: any) => {
      expect(item.fitScore).toBeGreaterThanOrEqual(0.6);
      expect(item.adDisclosure).toBeTruthy();
    });
  }, 60000);
});
