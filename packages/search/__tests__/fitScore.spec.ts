/**
 * Tests for fitScore calculation
 * Edge cases + reasons text validation + ε-greedy + diversity
 */

import { describe, it, expect } from 'vitest';
import {
  calculateFitScore,
  applyEpsilonGreedy,
  calculateSlateOverlap,
  type FitScoreArgs,
} from '../src/fitScore';
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

    it('should include novelty score when provided', () => {
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
        novelty: 0.9,
      };

      const result = calculateFitScore(args);

      expect(result.novelty).toBe(0.9);
      expect(result.components.find(c => c.key === 'novelty')).toBeDefined();
    });
  });

  describe('applyEpsilonGreedy', () => {
    const mockCandidates = Array.from({ length: 50 }, (_, i) => ({
      id: `event-${i}`,
      fitScore: 1 - i * 0.01,
    }));

    it('should select top K candidates with epsilon=0', () => {
      const result = applyEpsilonGreedy(mockCandidates, 10, 0);

      expect(result).toHaveLength(10);
      expect(result[0].fitScore).toBeGreaterThanOrEqual(result[9].fitScore);
      expect(result.exploredIndices).toHaveLength(0);
    });

    it('should include exploration with epsilon > 0', () => {
      const result = applyEpsilonGreedy(mockCandidates, 10, 0.3);

      expect(result).toHaveLength(10);
      expect(result.exploredIndices).toBeDefined();
      expect(result.exploredIndices!.length).toBeGreaterThan(0);
      expect(result.exploredIndices!.length).toBeLessThanOrEqual(3); // ~30% of 10
    });

    it('should handle empty candidates', () => {
      const result = applyEpsilonGreedy([], 10, 0.2);

      expect(result).toHaveLength(0);
    });

    it('should handle fewer candidates than topK', () => {
      const fewCandidates = mockCandidates.slice(0, 5);
      const result = applyEpsilonGreedy(fewCandidates, 10, 0.2);

      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe('calculateSlateOverlap', () => {
    it('should return 1 for identical slates', () => {
      const slate1 = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const slate2 = [{ id: '1' }, { id: '2' }, { id: '3' }];

      const overlap = calculateSlateOverlap(slate1, slate2);

      expect(overlap).toBe(1);
    });

    it('should calculate partial overlap correctly', () => {
      const slate1 = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const slate2 = [{ id: '2' }, { id: '3' }, { id: '4' }];

      const overlap = calculateSlateOverlap(slate1, slate2);

      expect(overlap).toBeGreaterThan(0);
      expect(overlap).toBeLessThan(1);
    });

    it('should return 0 for completely different slates', () => {
      const slate1 = [{ id: '1' }, { id: '2' }];
      const slate2 = [{ id: '3' }, { id: '4' }];

      const overlap = calculateSlateOverlap(slate1, slate2);

      expect(overlap).toBe(0);
    });

    it('should meet diversity target of <40% overlap', () => {
      // Simulating 3 diverse slates
      const best = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];
      const wildcard = [{ id: '6' }, { id: '7' }, { id: '8' }, { id: '9' }, { id: '2' }];
      const closeAndEasy = [{ id: '10' }, { id: '11' }, { id: '12' }, { id: '3' }, { id: '7' }];

      const overlap1 = calculateSlateOverlap(best, wildcard);
      const overlap2 = calculateSlateOverlap(best, closeAndEasy);
      const overlap3 = calculateSlateOverlap(wildcard, closeAndEasy);

      expect(overlap1).toBeLessThan(0.4);
      expect(overlap2).toBeLessThan(0.4);
      expect(overlap3).toBeLessThan(0.4);
    });
  });
});
