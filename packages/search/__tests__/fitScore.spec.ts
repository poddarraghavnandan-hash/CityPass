/**
 * Tests for fitScore calculation
 * Edge cases + reasons text validation
 */

import { describe, it, expect } from 'vitest';
import { calculateFitScore, type FitScoreArgs } from '../src/fitScore';
import type { Intention } from '@citypass/types/lens';

const mockIntention: Intention = {
  city: 'New York',
  nowISO: new Date('2025-01-09T12:00:00Z').toISOString(),
  tokens: {
    mood: 'electric',
    untilMinutes: 180,
    distanceKm: 5,
    budget: 'casual',
    companions: ['crew'],
  },
  source: 'inline',
};

describe('FitScore', () => {
  describe('calculateFitScore', () => {
    it('returns high score for perfect match', () => {
      const args: FitScoreArgs = {
        event: {
          id: '1',
          category: 'MUSIC',
          startTime: new Date('2025-01-09T14:00:00Z'), // 2 hours from now
          priceMin: 30,
          priceMax: 50,
          lat: 40.7128,
          lon: -74.006,
          tags: ['live', 'concert'],
        },
        intention: mockIntention,
        textualSimilarity: 0.9,
        semanticSimilarity: 0.85,
        distanceKm: 2,
        socialProof: {
          views: 100,
          saves: 20,
          friends: 3,
        },
      };

      const result = calculateFitScore(args);

      expect(result.score).toBeGreaterThan(0.7);
      expect(result.moodScore).toBeGreaterThan(0.5);
      expect(result.socialHeat).toBeGreaterThan(0.3);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('returns reasons with proper text', () => {
      const args: FitScoreArgs = {
        event: {
          id: '1',
          category: 'MUSIC',
          startTime: new Date('2025-01-09T13:00:00Z'),
          priceMin: 20,
          priceMax: 40,
          lat: 40.7128,
          lon: -74.006,
          tags: [],
        },
        intention: mockIntention,
        textualSimilarity: 0.95,
        semanticSimilarity: 0.8,
        distanceKm: 1,
        socialProof: { views: 50, saves: 10, friends: 2 },
      };

      const result = calculateFitScore(args);

      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/keywords|similar|vibe|budget|close|window/i),
        ])
      );
    });

    it('handles free events correctly', () => {
      const freeIntention: Intention = {
        ...mockIntention,
        tokens: { ...mockIntention.tokens, budget: 'free' },
      };

      const args: FitScoreArgs = {
        event: {
          id: '1',
          category: 'FITNESS',
          startTime: new Date('2025-01-09T13:00:00Z'),
          priceMin: 0,
          priceMax: 0,
          lat: null,
          lon: null,
          tags: [],
        },
        intention: freeIntention,
        textualSimilarity: 0.7,
        semanticSimilarity: 0.6,
        distanceKm: null,
      };

      const result = calculateFitScore(args);

      expect(result.components.find(c => c.key === 'budget')?.value).toBe(1);
      expect(result.reasons).toEqual(
        expect.arrayContaining([expect.stringMatching(/budget/i)])
      );
    });

    it('handles missing location data gracefully', () => {
      const args: FitScoreArgs = {
        event: {
          id: '1',
          category: 'ARTS',
          startTime: new Date('2025-01-09T15:00:00Z'),
          priceMin: null,
          priceMax: null,
          lat: null,
          lon: null,
          tags: [],
        },
        intention: mockIntention,
        textualSimilarity: 0.6,
        semanticSimilarity: 0.6,
        distanceKm: null,
      };

      const result = calculateFitScore(args);

      expect(result.score).toBeGreaterThan(0);
      expect(result.components.find(c => c.key === 'distance')?.value).toBe(0.6);
    });

    it('penalizes events outside time window', () => {
      const args: FitScoreArgs = {
        event: {
          id: '1',
          category: 'MUSIC',
          startTime: new Date('2025-01-09T20:00:00Z'), // 8 hours from now (beyond 3h window)
          priceMin: 30,
          priceMax: 50,
          lat: null,
          lon: null,
          tags: [],
        },
        intention: mockIntention,
        textualSimilarity: 0.9,
        semanticSimilarity: 0.9,
        distanceKm: null,
      };

      const result = calculateFitScore(args);

      const recencyScore = result.components.find(c => c.key === 'recency')?.value;
      expect(recencyScore).toBeLessThan(0.7);
    });

    it('rewards high social proof', () => {
      const args: FitScoreArgs = {
        event: {
          id: '1',
          category: 'MUSIC',
          startTime: new Date('2025-01-09T14:00:00Z'),
          priceMin: null,
          priceMax: null,
          lat: null,
          lon: null,
          tags: [],
        },
        intention: mockIntention,
        textualSimilarity: 0.5,
        semanticSimilarity: 0.5,
        distanceKm: null,
        socialProof: {
          views: 500,
          saves: 100,
          friends: 10,
        },
      };

      const result = calculateFitScore(args);

      expect(result.socialHeat).toBeGreaterThan(0.7);
      expect(result.reasons).toEqual(
        expect.arrayContaining([expect.stringMatching(/trending|locals/i)])
      );
    });

    it('calculates mood score correctly for matching categories', () => {
      const args: FitScoreArgs = {
        event: {
          id: '1',
          category: 'MUSIC', // matches 'electric' mood
          startTime: new Date('2025-01-09T14:00:00Z'),
          priceMin: null,
          priceMax: null,
          lat: null,
          lon: null,
          tags: [],
        },
        intention: mockIntention,
        textualSimilarity: 0.5,
        semanticSimilarity: 0.5,
        distanceKm: null,
      };

      const result = calculateFitScore(args);

      expect(result.moodScore).toBe(1);
      expect(result.reasons).toEqual(
        expect.arrayContaining([expect.stringMatching(/electric.*vibe/i)])
      );
    });

    it('handles null category gracefully', () => {
      const args: FitScoreArgs = {
        event: {
          id: '1',
          category: null,
          startTime: new Date('2025-01-09T14:00:00Z'),
          priceMin: null,
          priceMax: null,
          lat: null,
          lon: null,
          tags: [],
        },
        intention: mockIntention,
        textualSimilarity: 0.5,
        semanticSimilarity: 0.5,
        distanceKm: null,
      };

      const result = calculateFitScore(args);

      expect(result.moodScore).toBe(0.4); // neutral score for missing category
      expect(result.score).toBeGreaterThan(0);
    });

    it('calculates all components correctly', () => {
      const args: FitScoreArgs = {
        event: {
          id: '1',
          category: 'MUSIC',
          startTime: new Date('2025-01-09T13:30:00Z'),
          priceMin: 40,
          priceMax: 60,
          lat: 40.7128,
          lon: -74.006,
          tags: ['live'],
        },
        intention: mockIntention,
        textualSimilarity: 0.8,
        semanticSimilarity: 0.75,
        distanceKm: 3,
        socialProof: { views: 75, saves: 15, friends: 1 },
      };

      const result = calculateFitScore(args);

      expect(result.components).toHaveLength(7);
      expect(result.components.map(c => c.key)).toEqual([
        'textual',
        'semantic',
        'mood',
        'social',
        'budget',
        'distance',
        'recency',
      ]);

      const total = result.components.reduce((sum, c) => sum + c.contribution, 0);
      expect(total).toBeCloseTo(result.score, 2);
    });
  });
});
