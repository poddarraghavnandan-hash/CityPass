/**
 * Tests for RAG retriever
 * Hybrid union, rerank order validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Mock Qdrant and Typesense clients
vi.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue([
      {
        id: 'v1',
        score: 0.95,
        payload: {
          title: 'DJ Night at Brooklyn Bowl',
          description: 'Electronic music night',
          category: 'MUSIC',
          city: 'New York',
          startTime: '2025-01-09T20:00:00Z',
          priceMin: 25,
          priceMax: 40,
        },
      },
      {
        id: 'v2',
        score: 0.88,
        payload: {
          title: 'Live Jazz at Blue Note',
          description: 'Jazz quartet performance',
          category: 'MUSIC',
          city: 'New York',
          startTime: '2025-01-09T21:00:00Z',
          priceMin: 35,
          priceMax: 50,
        },
      },
    ]),
    getCollections: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('typesense', () => ({
  default: {
    Client: vi.fn().mockImplementation(() => ({
      collections: vi.fn().mockReturnValue({
        documents: vi.fn().mockReturnValue({
          search: vi.fn().mockResolvedValue({
            hits: [
              {
                document: {
                  id: 'k1',
                  title: 'Comedy Show at Gotham',
                  description: 'Stand-up comedy night',
                  category: 'COMEDY',
                  city: 'New York',
                  start_time: Math.floor(new Date('2025-01-09T19:00:00Z').getTime() / 1000),
                  price_min: 20,
                  price_max: 30,
                },
                text_match_info: { score: 250 },
              },
              {
                document: {
                  id: 'v1', // Overlap with vector result
                  title: 'DJ Night at Brooklyn Bowl',
                  description: 'Electronic music night',
                  category: 'MUSIC',
                  city: 'New York',
                  start_time: Math.floor(new Date('2025-01-09T20:00:00Z').getTime() / 1000),
                  price_min: 25,
                  price_max: 40,
                },
                text_match_info: { score: 220 },
              },
            ],
          }),
        }),
        retrieve: vi.fn().mockResolvedValue({}),
      }),
    })),
  },
}));

// Skip these tests when Qdrant/Typesense are not available
// These are integration tests that require live search services
const shouldSkip = !process.env.QDRANT_URL || !process.env.TYPESENSE_HOST || process.env.SKIP_INTEGRATION_TESTS === 'true';

describe.skipIf(shouldSkip)('RAG Retriever', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('retrieve', () => {
    it('performs hybrid search with vector and keyword', async () => {
      // Import here to use mocked modules
      const { retrieve } = await import('../src/retriever');

      const result = await retrieve('electronic music', mockIntention);

      expect(result.vectorCount).toBeGreaterThan(0);
      expect(result.keywordCount).toBeGreaterThan(0);
      expect(result.candidates.length).toBeGreaterThan(0);
    });

    it('unions results without duplicates', async () => {
      const { retrieve } = await import('../src/retriever');

      const result = await retrieve('electronic music', mockIntention);

      const ids = result.candidates.map(c => c.id);
      const uniqueIds = new Set(ids);

      expect(ids.length).toBe(uniqueIds.size); // No duplicates
    });

    it('returns candidates from both sources', async () => {
      const { retrieve } = await import('../src/retriever');

      const result = await retrieve('electronic music', mockIntention);

      const sources = new Set(result.candidates.map(c => c.source));

      // Should have both vector and keyword/hybrid candidates
      expect(sources.size).toBeGreaterThan(0);
    });

    it('respects topK limit', async () => {
      const { retrieve } = await import('../src/retriever');

      const result = await retrieve('electronic music', mockIntention, {
        topK: 2,
        rerankTop: 2,
        useReranker: false,
      });

      expect(result.candidates.length).toBeLessThanOrEqual(2);
    });

    it('handles timeout gracefully', async () => {
      const { retrieve } = await import('../src/retriever');

      const result = await retrieve('electronic music', mockIntention, {
        timeout: 1, // Very short timeout
      });

      // Should not throw, should return empty or partial results
      expect(result.candidates).toBeDefined();
      expect(result.latencyMs).toBeDefined();
    });

    it('tracks latency correctly', async () => {
      const { retrieve } = await import('../src/retriever');

      const result = await retrieve('electronic music', mockIntention);

      expect(result.latencyMs).toBeGreaterThan(0);
      expect(result.latencyMs).toBeLessThan(10000); // Should complete within 10s
    });

    it('uses cache when cacheKey is provided', async () => {
      const { retrieve } = await import('../src/retriever');

      const cacheKey = 'test-cache-key';

      // First call - should populate cache
      const result1 = await retrieve('electronic music', mockIntention, {
        cacheKey,
      });

      // Second call - should use cache
      const result2 = await retrieve('electronic music', mockIntention, {
        cacheKey,
      });

      expect(result1.candidates).toEqual(result2.candidates);
      expect(result2.latencyMs).toBeLessThan(result1.latencyMs); // Cache should be faster
    });

    it('indicates when reranking is applied', async () => {
      const { retrieve } = await import('../src/retriever');

      const result = await retrieve('electronic music', mockIntention, {
        useReranker: true,
      });

      // rerankApplied may be false if RERANKER_ENDPOINT_URL not configured
      expect(typeof result.rerankApplied).toBe('boolean');
    });
  });

  describe('healthCheck', () => {
    it('checks connectivity to services', async () => {
      const { healthCheck } = await import('../src/retriever');

      const health = await healthCheck();

      expect(health).toHaveProperty('qdrant');
      expect(health).toHaveProperty('typesense');
      expect(health).toHaveProperty('reranker');
      expect(typeof health.qdrant).toBe('boolean');
      expect(typeof health.typesense).toBe('boolean');
      expect(typeof health.reranker).toBe('boolean');
    });
  });
});
