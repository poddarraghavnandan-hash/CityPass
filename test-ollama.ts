/**
 * Test Ollama connection and intent extraction
 */

import 'dotenv/config';
import { Ollama } from 'ollama';

async function main() {
  console.log('\n=== Testing Ollama Connection ===\n');

  const ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
  const ollamaApiKey = process.env.OLLAMA_API_KEY;
  const useOllama = process.env.USE_OLLAMA !== 'false';

  console.log(`1. Configuration:`);
  console.log(`   Host: ${ollamaHost}`);
  console.log(`   API Key: ${ollamaApiKey ? ollamaApiKey.substring(0, 20) + '...' : 'Not set'}`);
  console.log(`   USE_OLLAMA: ${useOllama}`);

  if (!useOllama) {
    console.log('\n❌ Ollama is disabled (USE_OLLAMA=false)\n');
    return;
  }

  try {
    const client = new Ollama({
      host: ollamaHost,
      // Note: Ollama SDK might not support API key directly
      // Cloud API might require different authentication
    });

    console.log('\n2. Testing connection...');

    // Try listing models
    try {
      const models = await client.list();
      console.log(`   ✓ Connected! Found ${models.models?.length || 0} models`);
      if (models.models && models.models.length > 0) {
        console.log(`   Available models:`);
        models.models.slice(0, 5).forEach((m: any) => {
          console.log(`     - ${m.name}`);
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️ Could not list models: ${error.message}`);
    }

    // Test intent extraction
    console.log('\n3. Testing intent extraction...');
    const testQuery = 'live music this weekend in new york';

    const systemPrompt = `Extract structured intent from the query. Return ONLY valid JSON with these fields:
{
  "timeWindow": {"untilMinutes": number, "humanReadable": string},
  "vibe": "calm" | "social" | "electric" | "artistic" | "grounded"
}`;

    const response = await client.chat({
      model: process.env.OLLAMA_INTENT_MODEL || 'qwen2.5:7b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract intent from: "${testQuery}"` },
      ],
      format: 'json',
      options: {
        temperature: 0.1,
        num_predict: 300,
      },
    });

    console.log(`   ✓ Intent extraction successful!`);
    console.log(`   Response: ${response.message.content}`);

    console.log('\n✅ Ollama is working correctly!\n');
  } catch (error: any) {
    console.error('❌ Ollama test failed:', error.message);
    if (error.cause) {
      console.error(`   Cause: ${error.cause}`);
    }
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
  }
}

main();
