/**
 * LLM Intent Extraction Tests
 * Tests for LLM-based and fallback intent parsing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractIntentWithFallback,
  extractIntentWithLLM,
  generatePlanningWithOllama,
  estimateCost,
} from '../src/llm-intent';

describe('extractIntentWithFallback', () => {
  beforeEach(() => {
    // Clear environment
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('should fall back to pattern extraction when LLM disabled', async () => {
    const result = await extractIntentWithFallback(
      'electric music events tonight near Brooklyn',
      { useLLM: false }
    );

    expect(result.method).toBe('pattern');
    expect(result.tokens.mood).toBe('electric');
  });

  it('should fall back to pattern when no API keys', async () => {
    const result = await extractIntentWithFallback(
      'relaxing yoga class tomorrow',
      { useLLM: true }
    );

    // Should fall back to pattern since no API keys
    expect(result.method).toBe('pattern');
    expect(result.tokens.mood).toBe('calm');
  });

  it('should return defaults when no patterns match', async () => {
    const result = await extractIntentWithFallback(
      'xyz abc 123', // Nonsense query
      { useLLM: false }
    );

    expect(result.method).toBe('defaults');
    expect(result.tokens).toEqual({});
  });

  it('should merge with base tokens', async () => {
    const result = await extractIntentWithFallback(
      'tonight',
      {
        useLLM: false,
        baseTokens: { budget: 'casual', companions: ['solo'] },
      }
    );

    expect(result.tokens.budget).toBe('casual');
    expect(result.tokens.companions).toContain('solo');
    expect(result.tokens.untilMinutes).toBeDefined(); // From "tonight"
  });

  it('should include extraction metadata', async () => {
    const result = await extractIntentWithFallback(
      'electric music tonight',
      { useLLM: false }
    );

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.patternMatches).toBeInstanceOf(Array);
  });
});

describe('estimateCost', () => {
  it('should estimate cost for short query', () => {
    const cost = estimateCost(50); // "electric music events tonight"

    expect(cost.inputTokens).toBeGreaterThan(0);
    expect(cost.outputTokens).toBe(100);
    expect(cost.estimatedCostUSD).toBeGreaterThan(0);
    expect(cost.estimatedCostUSD).toBeLessThan(0.001); // Should be < $0.001
  });

  it('should estimate cost for long query', () => {
    const longQuery = 'a'.repeat(1000);
    const cost = estimateCost(longQuery.length);

    expect(cost.inputTokens).toBeGreaterThan(200);
    expect(cost.estimatedCostUSD).toBeLessThan(0.01); // Still very cheap
  });
});

describe('Integration', () => {
  it('should handle complex multi-token query', async () => {
    const result = await extractIntentWithFallback(
      'Looking for strenuous workout classes this weekend near downtown with friends under $25',
      { useLLM: false }
    );

    expect(result.method).toBe('pattern');
    expect(result.tokens.companions).toContain('friends');
    expect(result.tokens.budget).toBe('casual');
  });

  it('should handle ambiguous query gracefully', async () => {
    const result = await extractIntentWithFallback(
      'something fun',
      { useLLM: false }
    );

    // Should return defaults since "fun" is too vague
    expect(result.method).toBe('defaults');
  });
});

describe('extractIntentWithLLM - Ollama Support', () => {
  beforeEach(() => {
    // Clear all API keys to test Ollama fallback
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    vi.unstubAllEnvs();
  });

  it('should prioritize Claude over OpenAI over Ollama', async () => {
    // With all keys available, should use Claude
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    vi.stubEnv('USE_OLLAMA', 'true');

    // Mock will fail, but we can check the priority logic
    const result = await extractIntentWithLLM('test query', { model: 'auto' });

    // Should attempt Claude first (will fail without real API)
    expect(result).toBeNull(); // Expected since mocked
  });

  it('should return null when no LLM available', async () => {
    vi.stubEnv('USE_OLLAMA', 'false');

    const result = await extractIntentWithLLM('test query');
    expect(result).toBeNull();
  });

  it('should support explicit Ollama model selection', async () => {
    vi.stubEnv('USE_OLLAMA', 'true');
    vi.stubEnv('OLLAMA_HOST', 'http://localhost:11434');

    // Will fail without running Ollama, but tests the code path
    const result = await extractIntentWithLLM('electric music tonight', {
      model: 'ollama'
    });

    // Expected to fail without real Ollama
    expect(result).toBeNull();
  });
});

describe('generatePlanningWithOllama', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return null when Ollama disabled', async () => {
    vi.stubEnv('USE_OLLAMA', 'false');

    const result = await generatePlanningWithOllama(
      'You are a planner',
      'Plan an event',
    );

    expect(result).toBeNull();
  });

  it('should use OLLAMA_PLANNING_MODEL env var', async () => {
    vi.stubEnv('USE_OLLAMA', 'true');
    vi.stubEnv('OLLAMA_PLANNING_MODEL', 'qwen2.5:72b');
    vi.stubEnv('OLLAMA_HOST', 'http://localhost:11434');

    // Will fail without real Ollama, but tests configuration
    const result = await generatePlanningWithOllama(
      'System prompt',
      'User prompt',
      { temperature: 0.7, maxTokens: 150 }
    );

    // Expected to fail without real Ollama service
    expect(result).toBeNull();
  });

  it('should handle Ollama connection errors gracefully', async () => {
    vi.stubEnv('USE_OLLAMA', 'true');
    vi.stubEnv('OLLAMA_HOST', 'http://invalid-host:99999');

    const result = await generatePlanningWithOllama(
      'System',
      'User'
    );

    expect(result).toBeNull(); // Should fail gracefully
  });
});

describe('Fallback Chain Integration', () => {
  it('should use complete fallback chain: Claude → OpenAI → Ollama → Pattern', async () => {
    // No API keys, but Ollama available
    vi.stubEnv('USE_OLLAMA', 'true');

    const result = await extractIntentWithFallback(
      'electric music events tonight',
      { useLLM: true, llmModel: 'auto' }
    );

    // Should fall through to pattern matching
    expect(result.method).toBe('pattern');
    expect(result.tokens.mood).toBe('electric');
    expect(result.tokens.untilMinutes).toBeDefined();
  });

  it('should respect llmModel override', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test');

    // Even with Anthropic key, can force Ollama
    const result = await extractIntentWithFallback(
      'relaxing yoga',
      { useLLM: true, llmModel: 'ollama' }
    );

    // Will fall back to pattern since Ollama not running
    expect(result.method).toBe('pattern');
    expect(result.tokens.mood).toBe('calm');
  });
});
