/**
 * Test external service connections
 */

import 'dotenv/config';
import neo4j from 'neo4j-driver';
import { QdrantClient } from '@qdrant/js-client-rest';

async function testNeo4j() {
  console.log('\n=== Testing Neo4j Connection ===\n');

  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
  );

  try {
    const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });

    console.log('1. Testing connection...');
    const result = await session.run('RETURN 1 as test');
    console.log(`   ✓ Connection successful! Test query returned: ${result.records[0].get('test')}`);

    console.log('\n2. Checking database info...');
    const dbInfo = await session.run('CALL dbms.components() YIELD name, versions, edition');
    const record = dbInfo.records[0];
    console.log(`   ✓ Database: ${record.get('name')}`);
    console.log(`   ✓ Version: ${record.get('versions')[0]}`);
    console.log(`   ✓ Edition: ${record.get('edition')}`);

    console.log('\n3. Checking Event nodes...');
    const eventCount = await session.run('MATCH (e:Event) RETURN count(e) as count');
    console.log(`   ✓ Event nodes: ${eventCount.records[0].get('count')}`);

    console.log('\n4. Checking User nodes...');
    const userCount = await session.run('MATCH (u:User) RETURN count(u) as count');
    console.log(`   ✓ User nodes: ${userCount.records[0].get('count')}`);

    await session.close();
    console.log('\n✅ Neo4j connection fully operational!\n');
    return true;
  } catch (error: any) {
    console.error('❌ Neo4j connection failed:', error.message);
    console.error(`   Code: ${error.code}`);
    return false;
  } finally {
    await driver.close();
  }
}

async function testQdrant() {
  console.log('\n=== Testing Qdrant Connection ===\n');

  const client = new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY,
  });

  try {
    console.log('1. Testing connection...');
    const collections = await client.getCollections();
    console.log(`   ✓ Connection successful! Found ${collections.collections.length} collections`);

    if (collections.collections.length > 0) {
      console.log('\n2. Collections:');
      for (const col of collections.collections) {
        console.log(`   - ${col.name}`);
      }
    }

    console.log('\n3. Checking events_e5 collection...');
    try {
      const collection = await client.getCollection('events_e5');
      console.log(`   ✓ Collection exists`);
      console.log(`   ✓ Points: ${collection.points_count}`);
      console.log(`   ✓ Vectors: ${collection.vectors_count}`);
    } catch {
      console.log(`   ⚠️  Collection "events_e5" not found - needs to be created`);
    }

    console.log('\n✅ Qdrant connection successful!\n');
    return true;
  } catch (error: any) {
    console.error('❌ Qdrant connection failed:', error.message);
    if (error.cause) {
      console.error(`   Cause: ${error.cause.message || error.cause}`);
    }
    return false;
  }
}

async function main() {
  console.log('🔍 Testing External Service Connections\n');
  console.log('═'.repeat(50));

  const neo4jOk = await testNeo4j();
  const qdrantOk = await testQdrant();

  console.log('═'.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   Neo4j:  ${neo4jOk ? '✅ Connected' : '❌ Failed'}`);
  console.log(`   Qdrant: ${qdrantOk ? '✅ Connected' : '❌ Failed'}`);
  console.log();

  process.exit(neo4jOk && qdrantOk ? 0 : 1);
}

main();
