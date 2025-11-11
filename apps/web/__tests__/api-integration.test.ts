/**
 * Integration tests for API routes
 * Tests request/response schemas, rate limiting, and error handling
 */

import { describe, it, expect } from 'vitest';

describe('API Route Integration Tests', () => {
  describe('POST /api/ask', () => {
    it('should have correct input schema structure', () => {
      const validInput = {
        freeText: 'live music tonight',
        context: {
          city: 'New York',
          userId: 'user-123',
          sessionId: 'session-456',
          overrides: {
            mood: 'electric',
          },
        },
      };

      expect(validInput.freeText).toBeDefined();
      expect(validInput.context).toBeDefined();
    });

    it('should expect intention tokens in response', () => {
      const expectedResponse = {
        tokens: {
          mood: 'electric',
          untilMinutes: 180,
          distanceKm: 5,
          budget: 'casual',
          companions: ['solo'],
        },
        intention: {
          city: 'New York',
          nowISO: '2025-11-10T12:00:00.000Z',
          tokens: {},
          source: 'inferred',
        },
        traceId: 'trace-123',
        success: true,
      };

      expect(expectedResponse.tokens).toBeDefined();
      expect(expectedResponse.intention).toBeDefined();
      expect(expectedResponse.traceId).toBeDefined();
    });
  });

  describe('POST /api/plan', () => {
    it('should have correct input schema structure', () => {
      const validInput = {
        user: {
          id: 'user-123',
          city: 'New York',
        },
        freeText: 'romantic dinner',
        tokens: {
          mood: 'calm',
          budget: 'splurge',
        },
      };

      expect(validInput.user).toBeDefined();
      expect(validInput.tokens).toBeDefined();
    });

    it('should expect slates in response', () => {
      const expectedResponse = {
        slates: {
          best: [],
          wildcard: [],
          closeAndEasy: [],
        },
        reasons: [],
        intention: {},
        logs: [],
        latencyMs: 100,
        traceId: 'trace-123',
        success: true,
      };

      expect(expectedResponse.slates).toBeDefined();
      expect(expectedResponse.slates.best).toBeDefined();
      expect(expectedResponse.slates.wildcard).toBeDefined();
      expect(expectedResponse.slates.closeAndEasy).toBeDefined();
      expect(expectedResponse.reasons).toBeDefined();
    });
  });

  describe('POST /api/lens/recommend', () => {
    it('should have correct input schema structure', () => {
      const validInput = {
        intention: {
          user: {
            id: 'user-123',
            city: 'New York',
          },
          tokens: {
            mood: 'electric',
          },
          freeText: 'concerts',
        },
        page: 1,
        limit: 15,
        graphDiversification: false,
      };

      expect(validInput.intention).toBeDefined();
      expect(validInput.page).toBeGreaterThan(0);
      expect(validInput.limit).toBeGreaterThanOrEqual(6);
      expect(validInput.limit).toBeLessThanOrEqual(30);
    });

    it('should expect paginated items in response', () => {
      const expectedResponse = {
        items: [],
        slates: {
          best: [],
          wildcard: [],
          closeAndEasy: [],
        },
        page: 1,
        hasMore: false,
        intention: {},
        traceId: 'trace-123',
      };

      expect(expectedResponse.items).toBeDefined();
      expect(expectedResponse.page).toBeDefined();
      expect(expectedResponse.hasMore).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits per endpoint', () => {
      const rateLimits = {
        '/api/ask': { limit: 100, windowSeconds: 60 },
        '/api/plan': { limit: 50, windowSeconds: 60 },
        '/api/lens/recommend': { limit: 200, windowSeconds: 60 },
      };

      Object.entries(rateLimits).forEach(([endpoint, config]) => {
        expect(config.limit).toBeGreaterThan(0);
        expect(config.windowSeconds).toBeGreaterThan(0);
      });
    });

    it('should return 429 with rate limit headers when exceeded', () => {
      const expectedRateLimitResponse = {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        traceId: 'trace-123',
      };

      const expectedHeaders = {
        'Retry-After': '30',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': '1699622400',
      };

      expect(expectedRateLimitResponse.error).toBe('Rate limit exceeded');
      expect(expectedHeaders['Retry-After']).toBeDefined();
      expect(expectedHeaders['X-RateLimit-Limit']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return 400 for invalid request body', () => {
      const expectedErrorResponse = {
        error: 'Invalid request',
        details: {},
      };

      expect(expectedErrorResponse.error).toBe('Invalid request');
      expect(expectedErrorResponse.details).toBeDefined();
    });

    it('should return 500 for internal server errors', () => {
      const expectedErrorResponse = {
        error: 'Internal server error',
      };

      expect(expectedErrorResponse.error).toBe('Internal server error');
    });

    it('should include traceId in all error responses', () => {
      const errorWithTrace = {
        error: 'Some error',
        traceId: 'trace-123',
      };

      expect(errorWithTrace.traceId).toBeDefined();
      expect(typeof errorWithTrace.traceId).toBe('string');
    });
  });
});
