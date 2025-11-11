/**
 * Unit tests for fitScore.ts
 * Tests determinism, scoring functions, and reasons generation
 */

import { describe, it, expect } from 'vitest';
import { calculateFitScore, type FitScoreArgs } from './fitScore';
import type { Intention } from '@citypass/types';

const mockIntention: Intention = {
  city: 'New York',
  nowISO: '2025-11-10T12:00:00.000Z',
  tokens: {
    mood: 'electric',
    untilMinutes: 180,
    distanceKm: 5,
    budget: 'casual',
    companions: ['crew'],
  },
  source: 'inline',
};

describe('calculateFitScore', () => {
  it('should return deterministic scores for same input', () => {
    const args: FitScoreArgs = {
      event: {
        id: 'event-1',
        category: 'MUSIC',
        startTime: new Date('2025-11-10T14:00:00.000Z'),
        priceMin: 50,
        priceMax: 100,
      },
      intention: mockIntention,
      textualSimilarity: 0.8,
      semanticSimilarity: 0.7,
    };

    const result1 = calculateFitScore(args);
    const result2 = calculateFitScore(args);
    const result3 = calculateFitScore(args);

    expect(result1.score).toBe(result2.score);
    expect(result2.score).toBe(result3.score);
    expect(result1.reasons).toEqual(result2.reasons);
    expect(result2.reasons).toEqual(result3.reasons);
  });

  it('should calculate perfect score for ideal event', () => {
    const args: FitScoreArgs = {
      event: {
        id: 'event-perfect',
        category: 'MUSIC',
        startTime: new Date('2025-11-10T13:00:00.000Z'), // Within window
        priceMin: 50, // Within casual budget
        priceMax: 75,
      },
      intention: mockIntention,
      textualSimilarity: 1.0,
      semanticSimilarity: 1.0,
      distanceKm: 2, // Close
      socialProof: {
        views: 200,
        saves: 50,
        friends: 5,
      },
    };

    const result = calculateFitScore(args);

    expect(result.score).toBeGreaterThan(0.85);
    expect(result.moodScore).toBe(1);
    expect(result.socialHeat).toBeGreaterThan(0.8);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('should calculate mood score correctly for electric mood', () => {
    const musicArgs: FitScoreArgs = {
      event: { id: '1', category: 'MUSIC', startTime: new Date() },
      intention: { ...mockIntention, tokens: { ...mockIntention.tokens, mood: 'electric' } },
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const musicResult = calculateFitScore(musicArgs);
    expect(musicResult.moodScore).toBe(1); // MUSIC matches electric

    const foodArgs: FitScoreArgs = {
      event: { id: '2', category: 'FOOD', startTime: new Date() },
      intention: { ...mockIntention, tokens: { ...mockIntention.tokens, mood: 'electric' } },
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const foodResult = calculateFitScore(foodArgs);
    expect(foodResult.moodScore).toBe(0.3); // FOOD doesn't match electric
  });

  it('should calculate mood score correctly for calm mood', () => {
    const fitnessArgs: FitScoreArgs = {
      event: { id: '1', category: 'FITNESS', startTime: new Date() },
      intention: { ...mockIntention, tokens: { ...mockIntention.tokens, mood: 'calm' } },
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const result = calculateFitScore(fitnessArgs);
    expect(result.moodScore).toBe(1); // FITNESS matches calm
  });

  it('should handle missing category gracefully', () => {
    const args: FitScoreArgs = {
      event: { id: '1', category: null, startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const result = calculateFitScore(args);
    expect(result.moodScore).toBe(0.4); // Default for missing category
  });

  it('should score free budget correctly', () => {
    const freeIntention: Intention = {
      ...mockIntention,
      tokens: { ...mockIntention.tokens, budget: 'free' },
    };

    const freeArgs: FitScoreArgs = {
      event: { id: '1', category: 'MUSIC', startTime: new Date(), priceMin: 0 },
      intention: freeIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const freeResult = calculateFitScore(freeArgs);
    const budgetComponent = freeResult.components.find(c => c.key === 'budget');
    expect(budgetComponent?.value).toBe(1);

    const paidArgs: FitScoreArgs = {
      event: { id: '2', category: 'MUSIC', startTime: new Date(), priceMin: 20 },
      intention: freeIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const paidResult = calculateFitScore(paidArgs);
    const paidBudgetComponent = paidResult.components.find(c => c.key === 'budget');
    expect(paidBudgetComponent?.value).toBe(0);
  });

  it('should score casual budget correctly', () => {
    const args75: FitScoreArgs = {
      event: { id: '1', category: 'MUSIC', startTime: new Date(), priceMin: 75 },
      intention: mockIntention, // casual budget
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const result75 = calculateFitScore(args75);
    const budget75 = result75.components.find(c => c.key === 'budget');
    expect(budget75?.value).toBe(1); // At threshold

    const args90: FitScoreArgs = {
      event: { id: '2', category: 'MUSIC', startTime: new Date(), priceMin: 90 },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const result90 = calculateFitScore(args90);
    const budget90 = result90.components.find(c => c.key === 'budget');
    expect(budget90?.value).toBe(0.6); // Within 1.3x threshold

    const args200: FitScoreArgs = {
      event: { id: '3', category: 'MUSIC', startTime: new Date(), priceMin: 200 },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const result200 = calculateFitScore(args200);
    const budget200 = result200.components.find(c => c.key === 'budget');
    expect(budget200?.value).toBe(0.2); // Over threshold
  });

  it('should calculate distance score correctly', () => {
    const closeArgs: FitScoreArgs = {
      event: { id: '1', category: 'MUSIC', startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
      distanceKm: 2, // 40% of max (5km)
    };

    const closeResult = calculateFitScore(closeArgs);
    const closeDistance = closeResult.components.find(c => c.key === 'distance');
    expect(closeDistance?.value).toBe(1); // <= 50%

    const mediumArgs: FitScoreArgs = {
      event: { id: '2', category: 'MUSIC', startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
      distanceKm: 4, // 80% of max
    };

    const mediumResult = calculateFitScore(mediumArgs);
    const mediumDistance = mediumResult.components.find(c => c.key === 'distance');
    expect(mediumDistance?.value).toBe(0.7); // <= 100%

    const farArgs: FitScoreArgs = {
      event: { id: '3', category: 'MUSIC', startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
      distanceKm: 10, // 200% of max
    };

    const farResult = calculateFitScore(farArgs);
    const farDistance = farResult.components.find(c => c.key === 'distance');
    expect(farDistance?.value).toBe(0.1); // > 150%
  });

  it('should calculate recency score correctly', () => {
    const now = new Date('2025-11-10T12:00:00.000Z');
    const intention = { ...mockIntention, nowISO: now.toISOString() };

    // Event starting in 60 minutes (within 180-minute window)
    const soonArgs: FitScoreArgs = {
      event: {
        id: '1',
        category: 'MUSIC',
        startTime: new Date('2025-11-10T13:00:00.000Z'),
      },
      intention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const soonResult = calculateFitScore(soonArgs);
    const soonRecency = soonResult.components.find(c => c.key === 'recency');
    expect(soonRecency?.value).toBe(1); // Within window

    // Event starting in 200 minutes (outside 180-minute window but within 1.5x)
    const laterArgs: FitScoreArgs = {
      event: {
        id: '2',
        category: 'MUSIC',
        startTime: new Date('2025-11-10T15:20:00.000Z'),
      },
      intention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const laterResult = calculateFitScore(laterArgs);
    const laterRecency = laterResult.components.find(c => c.key === 'recency');
    expect(laterRecency?.value).toBe(0.6); // Within 1.5x

    // Event in the past
    const pastArgs: FitScoreArgs = {
      event: {
        id: '3',
        category: 'MUSIC',
        startTime: new Date('2025-11-10T11:00:00.000Z'),
      },
      intention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const pastResult = calculateFitScore(pastArgs);
    const pastRecency = pastResult.components.find(c => c.key === 'recency');
    expect(pastRecency?.value).toBe(0.2); // Past event
  });

  it('should calculate social heat correctly', () => {
    const highSocialArgs: FitScoreArgs = {
      event: { id: '1', category: 'MUSIC', startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
      socialProof: {
        views: 200, // High
        saves: 50, // High
        friends: 5, // High
      },
    };

    const highResult = calculateFitScore(highSocialArgs);
    expect(highResult.socialHeat).toBeGreaterThan(0.8);

    const lowSocialArgs: FitScoreArgs = {
      event: { id: '2', category: 'MUSIC', startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
      socialProof: {
        views: 5,
        saves: 1,
        friends: 0,
      },
    };

    const lowResult = calculateFitScore(lowSocialArgs);
    expect(lowResult.socialHeat).toBeLessThan(0.6); // Adjusted threshold

    const noSocialArgs: FitScoreArgs = {
      event: { id: '3', category: 'MUSIC', startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const noResult = calculateFitScore(noSocialArgs);
    expect(noResult.socialHeat).toBe(0.2); // Default
  });

  it('should generate correct reasons based on component scores', () => {
    const args: FitScoreArgs = {
      event: {
        id: 'event-1',
        category: 'MUSIC',
        startTime: new Date('2025-11-10T13:00:00.000Z'),
        priceMin: 40,
      },
      intention: mockIntention,
      textualSimilarity: 0.9, // High
      semanticSimilarity: 0.85, // High
      distanceKm: 2,
      socialProof: {
        views: 150,
        saves: 40,
        friends: 4,
      },
    };

    const result = calculateFitScore(args);

    // Should include top scoring components (>= 0.6) as reasons
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.length).toBeLessThanOrEqual(3);

    // Check that all reasons correspond to high-scoring components
    result.reasons.forEach(reason => {
      const component = result.components.find(c => c.label === reason);
      expect(component).toBeDefined();
      expect(component!.value).toBeGreaterThanOrEqual(0.6);
    });
  });

  it('should include all 7 components in result', () => {
    const args: FitScoreArgs = {
      event: { id: '1', category: 'MUSIC', startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 0.5,
      semanticSimilarity: 0.5,
    };

    const result = calculateFitScore(args);

    expect(result.components).toHaveLength(7);

    const keys = result.components.map(c => c.key);
    expect(keys).toContain('textual');
    expect(keys).toContain('semantic');
    expect(keys).toContain('mood');
    expect(keys).toContain('social');
    expect(keys).toContain('budget');
    expect(keys).toContain('distance');
    expect(keys).toContain('recency');
  });

  it('should clamp input similarities to [0, 1]', () => {
    const args: FitScoreArgs = {
      event: { id: '1', category: 'MUSIC', startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 1.5, // Over 1
      semanticSimilarity: -0.2, // Under 0
    };

    const result = calculateFitScore(args);

    const textual = result.components.find(c => c.key === 'textual');
    const semantic = result.components.find(c => c.key === 'semantic');

    expect(textual?.value).toBeLessThanOrEqual(1);
    expect(textual?.value).toBeGreaterThanOrEqual(0);
    expect(semantic?.value).toBeLessThanOrEqual(1);
    expect(semantic?.value).toBeGreaterThanOrEqual(0);
  });

  it('should calculate weighted contributions correctly', () => {
    const args: FitScoreArgs = {
      event: { id: '1', category: 'MUSIC', startTime: new Date() },
      intention: mockIntention,
      textualSimilarity: 1.0,
      semanticSimilarity: 1.0,
    };

    const result = calculateFitScore(args);

    // Each contribution should equal value * weight
    result.components.forEach(component => {
      expect(component.contribution).toBeCloseTo(component.value * component.weight, 5);
    });

    // Total score should equal sum of contributions
    const totalContribution = result.components.reduce((sum, c) => sum + c.contribution, 0);
    expect(result.score).toBeCloseTo(totalContribution, 5);
  });
});
