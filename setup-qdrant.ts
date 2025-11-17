/**
 * Setup Qdrant collection for event vectors
 */

import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

async function main() {
  console.log('\n=== Setting up Qdrant Collection ===\n');

  const client = new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY,
  });

  const collectionName = 'events_e5';

  try {
    // Check if collection exists
    console.log(`1. Checking if collection "${collectionName}" exists...`);
    try {
      await client.getCollection(collectionName);
      console.log(`   ✓ Collection already exists!`);
      return;
    } catch {
      console.log(`   → Collection doesn't exist, creating...`);
    }

    // Create collection
    console.log(`\n2. Creating collection "${collectionName}"...`);
    await client.createCollection(collectionName, {
      vectors: {
        size: 1024, // BGE-M3 embedding dimension
        distance: 'Cosine',
      },
      optimizers_config: {
        indexing_threshold: 10000,
      },
    });

    console.log(`   ✓ Collection created successfully!`);

    // Create payload index for faster filtering
    console.log(`\n3. Creating payload indexes...`);

    await client.createPayloadIndex(collectionName, {
      field_name: 'city',
      field_schema: 'keyword',
    });
    console.log(`   ✓ Created index on "city"`);

    await client.createPayloadIndex(collectionName, {
      field_name: 'category',
      field_schema: 'keyword',
    });
    console.log(`   ✓ Created index on "category"`);

    await client.createPayloadIndex(collectionName, {
      field_name: 'startTime',
      field_schema: 'integer',
    });
    console.log(`   ✓ Created index on "startTime"`);

    console.log('\n✅ Qdrant setup complete!\n');
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  }
}

main();
