/**
 * Ensure Qdrant Collection - Idempotent Setup
 * Creates or updates Qdrant vector collection for CityPass
 */

import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({
  url: process.env.QDRANT_URL || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = 'events';
const VECTOR_SIZE = 1024; // BGE-M3 embedding size
const DISTANCE = 'Cosine'; // or 'Dot', 'Euclid'

async function ensureCollection(): Promise<void> {
  try {
    console.log(`Checking collection: ${COLLECTION_NAME}...`);

    // Try to get collection info
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    if (exists) {
      console.log(`✅ Collection '${COLLECTION_NAME}' already exists`);

      // Verify configuration
      const info = await client.getCollection(COLLECTION_NAME);
      const vectorConfig = info.config?.params?.vectors;

      if (
        typeof vectorConfig === 'object' &&
        !Array.isArray(vectorConfig) &&
        vectorConfig.size === VECTOR_SIZE &&
        vectorConfig.distance === DISTANCE
      ) {
        console.log(`✅ Collection configuration is correct`);
        return;
      }

      console.log(`⚠️  Collection configuration mismatch. Please delete manually if needed.`);
      return;
    }

    // Create collection
    console.log(`Creating collection: ${COLLECTION_NAME}...`);

    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: DISTANCE as any,
      },
      optimizers_config: {
        indexing_threshold: 20000,
      },
      replication_factor: 2,
    });

    console.log(`✅ Collection '${COLLECTION_NAME}' created`);

    // Create payload indexes for efficient filtering
    console.log('Creating payload indexes...');

    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'city',
      field_schema: 'keyword',
    });

    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'category',
      field_schema: 'keyword',
    });

    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'startTime',
      field_schema: 'integer',
    });

    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: 'priceMin',
      field_schema: 'float',
    });

    console.log(`✅ Payload indexes created`);
  } catch (error: any) {
    console.error('❌ Error ensuring collection:', error.message || error);
    throw error;
  }
}

async function main() {
  console.log('🔍 Ensuring Qdrant collection...\n');

  try {
    // Test connection
    const health = await client.api('cluster').getClusterStatus();
    console.log(`✅ Connected to Qdrant (status: ${health.status})\n`);

    // Ensure collection
    await ensureCollection();

    console.log('\n🎉 Qdrant setup complete!');
    console.log(`\nCollection: ${COLLECTION_NAME}`);
    console.log(`Vector size: ${VECTOR_SIZE}`);
    console.log(`Distance: ${DISTANCE}`);
    console.log(`Payload indexes: city, category, startTime, priceMin`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up Qdrant:', error);
    process.exit(1);
  }
}

main();
