/**
 * Test Qdrant connection
 */

import { QdrantClient } from '@qdrant/js-client-rest';

async function main() {
  console.log('\n=== Testing Qdrant Connection ===\n');

  const client = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  });

  try {
    // Test 1: Get collections
    console.log('1. Fetching collections...');
    const collections = await client.getCollections();
    console.log(`   ✓ Found ${collections.collections.length} collections:`);
    collections.collections.forEach((c) => {
      console.log(`     - ${c.name}`);
    });

    // Test 2: Check if events_e5 collection exists
    const targetCollection = 'events_e5';
    console.log(`\n2. Checking collection "${targetCollection}"...`);
    try {
      const collection = await client.getCollection(targetCollection);
      console.log(`   ✓ Collection exists`);
      console.log(`   ✓ Vectors count: ${collection.vectors_count}`);
      console.log(`   ✓ Points count: ${collection.points_count}`);
    } catch (error: any) {
      console.log(`   ✗ Collection "${targetCollection}" not found`);
      console.log(`   → You may need to create it and index events`);
    }

    console.log('\n✅ Qdrant connection successful!\n');
  } catch (error: any) {
    console.error('❌ Qdrant connection failed:', error.message);
    if (error.status) {
      console.error(`   HTTP Status: ${error.status}`);
    }
  }
}

main();
