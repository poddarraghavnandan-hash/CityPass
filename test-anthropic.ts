/**
 * Test Anthropic API key
 */

import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

async function main() {
  console.log('\n=== Testing Anthropic API ===\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(`1. API Key present: ${apiKey ? '✓ Yes' : '✗ No'}`);
  console.log(`   Key prefix: ${apiKey?.substring(0, 20)}...`);

  const client = new Anthropic({
    apiKey: apiKey,
  });

  try {
    console.log('\n2. Testing API call...');
    const message = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: 'Say "API working" if you can read this.',
        },
      ],
    });

    console.log(`   ✓ API call successful!`);
    console.log(`   Response: ${message.content[0].type === 'text' ? message.content[0].text : 'N/A'}`);
    console.log('\n✅ Anthropic API is working correctly!\n');
  } catch (error: any) {
    console.error('❌ API call failed:', error.message);
    if (error.status) {
      console.error(`   HTTP Status: ${error.status}`);
    }
    if (error.error) {
      console.error(`   Error details:`, JSON.stringify(error.error, null, 2));
    }
  }
}

main();
