/**
 * Node: Parse Intent
 * Extract user intention from free text or tokens
 */

import { buildIntention } from '@citypass/utils';
import { extractIntentWithFallback } from '@citypass/utils/llm-intent';
import type { AgentState } from '../types';

export async function parseIntentNode(state: AgentState): Promise<Partial<AgentState>> {
  let extractedTokens: any = {};
  let extractionMethod: 'llm' | 'pattern' | 'defaults' = 'defaults';

  // Extract intent from free text if provided
  if (state.freeText) {
    const useLLM = process.env.DISABLE_LLM_INTENT !== 'true';
    const llmModel = (process.env.LLM_INTENT_MODEL || 'auto') as 'claude' | 'gpt' | 'auto';

    try {
      const result = await extractIntentWithFallback(state.freeText, {
        useLLM,
        llmModel,
        baseTokens: state.tokens,
      });

      extractedTokens = result.tokens;
      extractionMethod = result.method;

      console.log(`✨ [parseIntent] Extracted via ${extractionMethod}:`, extractedTokens);
    } catch (error: any) {
      console.error('[parseIntent] Extraction failed:', error.message);
      return {
        degradedFlags: {
          ...(state.degradedFlags || {}),
          noLLM: extractionMethod === 'llm',
        },
        warnings: [...(state.warnings || []), `Intent extraction degraded: ${error.message}`],
      };
    }
  }

  const intention = buildIntention({
    city: state.intention?.city,
    userId: state.userId,
    overrides: {
      ...state.tokens,
      ...extractedTokens,
    },
  });

  return {
    intention,
    tokens: intention.tokens,
  };
}
