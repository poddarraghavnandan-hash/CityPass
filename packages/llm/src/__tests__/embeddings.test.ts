import { describe, it, expect, beforeAll } from 'vitest';
import {
  selectModelForUseCase,
  cosineSimilarity,
  findMostSimilar,
  prepareEventTextForEmbedding,
  prepareQueryForEmbedding,
  normalizeVector,
  MODEL_CONFIG,
} from '../embeddings';

describe('Embedding System', () => {
  describe('Model Selection', () => {
    it('should select BGE-M3 for event indexing', () => {
      const model = selectModelForUseCase('event-indexing', true);
      expect(model).toBe('bge-m3');
    });

    it('should select GTE-Small for query search', () => {
      const model = selectModelForUseCase('query-search', true);
      expect(model).toBe('gte-small');
    });

    it('should select E5-Base-v2 for event similarity', () => {
      const model = selectModelForUseCase('event-similarity', true);
      expect(model).toBe('e5-base-v2');
    });

    it('should have valid model configurations', () => {
      const models: Array<keyof typeof MODEL_CONFIG> = ['bge-m3', 'e5-base-v2', 'gte-small', 'minilm-l6-v2'];

      models.forEach(model => {
        const config = MODEL_CONFIG[model];
        expect(config).toBeDefined();
        expect(config.dimensions).toBeGreaterThan(0);
        expect(config.maxTokens).toBeGreaterThan(0);
        expect(config.provider).toBeDefined();
        expect(config.useCases).toBeInstanceOf(Array);
        expect(config.useCases.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Vector Operations', () => {
    it('should calculate cosine similarity correctly', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [1, 0, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0.0, 5);
    });

    it('should handle negative similarity', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [-1, 0, 0];
      const similarity = cosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(-1.0, 5);
    });

    it('should find most similar vectors', () => {
      const query = [1, 0, 0];
      const candidates = [
        [1, 0, 0],     // Perfect match
        [0.9, 0.1, 0], // Close match
        [0, 1, 0],     // Orthogonal
        [-1, 0, 0],    // Opposite
      ];

      const results = findMostSimilar(query, candidates);

      expect(results[0].index).toBe(0); // Perfect match first
      expect(results[0].similarity).toBeCloseTo(1.0, 5);
      expect(results[1].index).toBe(1); // Close match second
      expect(results[3].similarity).toBeLessThan(0); // Opposite last
    });

    it('should normalize vectors to unit length', () => {
      const vector = [3, 4]; // Length = 5
      const normalized = normalizeVector(vector);

      expect(normalized[0]).toBeCloseTo(0.6, 5); // 3/5
      expect(normalized[1]).toBeCloseTo(0.8, 5); // 4/5

      // Check unit length
      const length = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
      expect(length).toBeCloseTo(1.0, 5);
    });

    it('should handle zero vectors', () => {
      const zero = [0, 0, 0];
      const normalized = normalizeVector(zero);
      expect(normalized).toEqual(zero);
    });
  });

  describe('Text Preparation', () => {
    it('should prepare event text with all fields', () => {
      const event = {
        title: 'Jazz Concert',
        description: 'A wonderful evening of live jazz music',
        category: 'MUSIC',
        venueName: 'Blue Note',
        neighborhood: 'Greenwich Village',
        tags: ['jazz', 'live-music', 'nightlife'],
      };

      const text = prepareEventTextForEmbedding(event);

      expect(text).toContain('Jazz Concert'); // Title appears
      expect(text).toContain('Category: MUSIC');
      expect(text).toContain('Venue: Blue Note');
      expect(text).toContain('Location: Greenwich Village');
      expect(text).toContain('live-music');
      expect(text).toContain('nightlife');
    });

    it('should handle minimal event data', () => {
      const event = {
        title: 'Simple Event',
      };

      const text = prepareEventTextForEmbedding(event);
      expect(text).toContain('Simple Event');
      expect(text.split('Simple Event').length).toBe(3); // Title repeated twice
    });

    it('should truncate long descriptions', () => {
      const event = {
        title: 'Event',
        description: 'A'.repeat(1000), // 1000 chars
      };

      const text = prepareEventTextForEmbedding(event);
      const descriptionMatch = text.match(/A+/);
      expect(descriptionMatch).toBeDefined();
      expect(descriptionMatch![0].length).toBeLessThanOrEqual(500);
    });

    it('should prepare query text with context', () => {
      const query = 'jazz concerts';
      const context = {
        category: 'MUSIC',
        city: 'New York',
        timePreference: 'tonight',
      };

      const text = prepareQueryForEmbedding(query, context);

      expect(text).toContain('jazz concerts');
      expect(text).toContain('Category: MUSIC');
      expect(text).toContain('City: New York');
      expect(text).toContain('Time: tonight');
    });

    it('should handle query without context', () => {
      const text = prepareQueryForEmbedding('jazz');
      expect(text).toBe('jazz');
    });
  });

  describe('Model Configuration Validation', () => {
    it('should have correct dimensions for BGE-M3', () => {
      expect(MODEL_CONFIG['bge-m3'].dimensions).toBe(1024);
    });

    it('should have correct dimensions for E5-Base-v2', () => {
      expect(MODEL_CONFIG['e5-base-v2'].dimensions).toBe(768);
    });

    it('should have correct dimensions for GTE-Small', () => {
      expect(MODEL_CONFIG['gte-small'].dimensions).toBe(384);
    });

    it('should map use cases correctly', () => {
      expect(MODEL_CONFIG['bge-m3'].useCases).toContain('event-indexing');
      expect(MODEL_CONFIG['gte-small'].useCases).toContain('query-search');
      expect(MODEL_CONFIG['e5-base-v2'].useCases).toContain('event-similarity');
    });

    it('should have valid latency estimates', () => {
      expect(MODEL_CONFIG['bge-m3'].avgLatency).toBeGreaterThan(0);
      expect(MODEL_CONFIG['gte-small'].avgLatency).toBeLessThan(MODEL_CONFIG['bge-m3'].avgLatency);
    });
  });
});

// Helper function (normally exported from embeddings.ts)
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}
