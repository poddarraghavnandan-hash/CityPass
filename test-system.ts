/**
 * System Integration Test
 * Tests database, events, and new agentic graph
 */

import 'dotenv/config';
import { PrismaClient } from '@citypass/db';
import { askAgent } from '@citypass/agent';

const prisma = new PrismaClient();

async function main() {
  console.log('\n=== CityPass System Integration Test ===\n');

  // Test 1: Database Connection
  console.log('1. Testing database connection...');
  try {
    const eventCount = await prisma.event.count();
    console.log(`   ✓ Connected! Found ${eventCount} events in database`);

    // Sample some events
    const sampleEvents = await prisma.event.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
        city: true,
        startTime: true,
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`   ✓ Sample events:`);
    sampleEvents.forEach(e => {
      console.log(`     - ${e.title} (${e.city}, ${e.category})`);
    });
  } catch (error: any) {
    console.error(`   ✗ Database error: ${error.message}`);
  }

  // Test 2: Venue Count
  console.log('\n2. Testing venues...');
  try {
    const venueCount = await prisma.venue.count();
    console.log(`   ✓ Found ${venueCount} venues`);
  } catch (error: any) {
    console.error(`   ✗ Venue error: ${error.message}`);
  }

  // Test 3: Learning System Tables
  console.log('\n3. Testing learning system tables...');
  try {
    const [tasteVectorCount, rankerCount, eventLogCount] = await Promise.all([
      prisma.tasteVector.count(),
      prisma.rankerSnapshot.count(),
      prisma.eventLog.count(),
    ]);
    console.log(`   ✓ TasteVectors: ${tasteVectorCount}`);
    console.log(`   ✓ RankerSnapshots: ${rankerCount}`);
    console.log(`   ✓ EventLogs: ${eventLogCount}`);
  } catch (error: any) {
    console.error(`   ✗ Learning system error: ${error.message}`);
  }

  // Test 4: Venue Knowledge Graph Tables
  console.log('\n4. Testing venue knowledge graph tables...');
  try {
    const [sourceCount, signalCount, heatIndexCount] = await Promise.all([
      prisma.venueSource.count(),
      prisma.venueSignal.count(),
      prisma.venueHeatIndex.count(),
    ]);
    console.log(`   ✓ VenueSources: ${sourceCount}`);
    console.log(`   ✓ VenueSignals: ${signalCount}`);
    console.log(`   ✓ VenueHeatIndex: ${heatIndexCount}`);
  } catch (error: any) {
    console.error(`   ✗ Venue knowledge graph error: ${error.message}`);
  }

  // Test 5: New Agentic Graph
  console.log('\n5. Testing new agentic graph (askAgent)...');
  try {
    console.log('   → Query: "live music this weekend in new york"');
    const result = await askAgent({
      freeText: 'live music this weekend in new york',
      userId: 'test-user',
      sessionId: 'test-session',
      traceId: 'test-trace',
      city: 'New York',
    });

    console.log(`   ✓ Graph executed successfully`);
    console.log(`   ✓ Intention: ${result.state.intention?.activity || 'N/A'}`);
    console.log(`   ✓ Slates generated:`);
    console.log(`     - Best: ${result.state.slates?.best?.events?.length || 0} events`);
    console.log(`     - Wildcard: ${result.state.slates?.wildcard?.events?.length || 0} events`);
    console.log(`     - Close & Easy: ${result.state.slates?.closeAndEasy?.events?.length || 0} events`);

    if (result.logs && result.logs.length > 0) {
      console.log(`   ✓ Nodes executed: ${result.logs.map(l => l.nodeName).join(' → ')}`);
    }
  } catch (error: any) {
    console.error(`   ✗ Agentic graph error: ${error.message}`);
    if (error.stack) {
      console.error(`      Stack: ${error.stack.split('\n').slice(0, 3).join('\n      ')}`);
    }
  }

  console.log('\n=== Test Complete ===\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
