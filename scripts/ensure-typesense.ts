/**
 * Ensure Typesense Collections - Idempotent Setup
 * Creates or updates Typesense collections for CityPass
 */

import Typesense from 'typesense';

const client = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108'),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 10,
});

const eventsSchema = {
  name: 'events',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'subtitle', type: 'string', optional: true },
    { name: 'description', type: 'string', optional: true },
    { name: 'category', type: 'string', facet: true },
    { name: 'city', type: 'string', facet: true },
    { name: 'neighborhood', type: 'string', facet: true, optional: true },
    { name: 'venueName', type: 'string', facet: true, optional: true },
    { name: 'organizer', type: 'string', facet: true, optional: true },
    { name: 'startTime', type: 'int64' },
    { name: 'endTime', type: 'int64', optional: true },
    { name: 'priceMin', type: 'float', optional: true },
    { name: 'priceMax', type: 'float', optional: true },
    { name: 'lat', type: 'float', optional: true },
    { name: 'lon', type: 'float', optional: true },
    { name: 'tags', type: 'string[]', optional: true, facet: true },
    { name: 'minAge', type: 'int32', optional: true },
    { name: 'imageUrl', type: 'string', optional: true },
    { name: 'bookingUrl', type: 'string', optional: true },
    { name: 'sourceDomain', type: 'string', facet: true },
  ],
  default_sorting_field: 'startTime',
};

async function ensureCollection(schema: any): Promise<void> {
  try {
    console.log(`Checking collection: ${schema.name}...`);

    // Try to retrieve the collection
    const existingCollection = await client.collections(schema.name).retrieve();
    console.log(`✅ Collection '${schema.name}' already exists`);

    // Check if schema needs updating
    const existingFields = existingCollection.fields?.map((f: any) => f.name).sort();
    const newFields = schema.fields.map((f: any) => f.name).sort();

    if (JSON.stringify(existingFields) !== JSON.stringify(newFields)) {
      console.log(`⚠️  Schema mismatch detected. Recreating collection '${schema.name}'...`);

      // Delete and recreate (WARNING: This will delete all data)
      await client.collections(schema.name).delete();
      await client.collections().create(schema);

      console.log(`✅ Collection '${schema.name}' recreated with new schema`);
    }
  } catch (error: any) {
    if (error?.httpStatus === 404) {
      // Collection doesn't exist, create it
      console.log(`Creating collection: ${schema.name}...`);
      await client.collections().create(schema);
      console.log(`✅ Collection '${schema.name}' created successfully`);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log('🔍 Ensuring Typesense collections...\n');

  try {
    // Test connection
    const health = await client.health.retrieve();
    console.log(`✅ Connected to Typesense (${health.ok ? 'healthy' : 'unhealthy'})\n`);

    // Ensure events collection
    await ensureCollection(eventsSchema);

    console.log('\n🎉 Typesense setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up Typesense:', error);
    process.exit(1);
  }
}

main();
