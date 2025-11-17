/**
 * Test database fallback with explicit intention
 */

import { askAgent } from '@citypass/agent';
import type { IntentionTokens } from '@citypass/types';

async function main() {
  console.log('\n=== Testing Database Fallback ===\n');

  // Create explicit intention tokens (bypassing parseIntent)
  const tokens: Partial<IntentionTokens> = {
    untilMinutes: 4320, // 72 hours / 3 days
    mood: 'electric',
    budget: 'casual',
  };

  console.log('Testing with explicit tokens:', tokens);
  console.log('Query: "music events in new york"\n');

  const result = await askAgent({
    freeText: 'music events in new york',
    userId: 'test-user-2',
    sessionId: 'test-session-2',
    traceId: 'test-trace-2',
    city: 'New York',
    tokens, // Provide explicit tokens to bypass parseIntent issues
  });

  console.log(`\n✅ Pipeline completed in ${result.logs?.[result.logs.length - 1]?.durationMs || 0}ms\n`);

  console.log('Results:');
  console.log(`- Best slate: ${result.state.slates?.best?.events?.length || 0} events`);
  console.log(`- Wildcard slate: ${result.state.slates?.wildcard?.events?.length || 0} events`);
  console.log(`- Close & Easy slate: ${result.state.slates?.closeAndEasy?.events?.length || 0} events`);

  if (result.state.slates?.best?.events?.length > 0) {
    console.log('\nSample events from Best slate:');
    result.state.slates.best.events.slice(0, 3).forEach(e => {
      console.log(`  - ${e.title} (${e.category})`);
    });
  }

  console.log('\n=== Test Complete ===\n');
}

main().catch(console.error);
