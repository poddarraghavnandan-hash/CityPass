/**
 * Test script to verify Ollama event extraction works
 */

import { extractEventsWithOllama } from './packages/utils/src/event-extraction';

// Sample event content to test extraction
const sampleContent = `
# Upcoming Events at Brooklyn Bowl

## The National - Live in Concert
Date: January 25, 2025, 8:00 PM
Location: Brooklyn Bowl, 61 Wythe Ave, Williamsburg, Brooklyn, NY
Price: $45 - $65
The National returns to Brooklyn Bowl for an intimate acoustic set.
Doors open at 7:00 PM, show starts at 8:00 PM.
Tickets: https://brooklynbowl.com/events/the-national

## Comedy Night with John Mulaney
Date: January 28, 2025, 7:30 PM
Location: Brooklyn Bowl, 61 Wythe Ave, Williamsburg, Brooklyn, NY
Price: $35 - $50
Stand-up comedy special featuring John Mulaney.
Limited seating available.
Book now: https://brooklynbowl.com/events/mulaney

## Sunday Brunch Music Series
Date: February 2, 2025, 11:00 AM
Location: Brooklyn Bowl, Brooklyn, NY
Price: Free with food purchase
Live jazz music while you enjoy our weekend brunch.
No ticket required.
`;

async function testOllamaExtraction() {
  console.log('🧪 Testing Ollama event extraction...\n');
  console.log(`Content length: ${sampleContent.length} characters\n`);

  try {
    const result = await extractEventsWithOllama(sampleContent, {
      city: 'New York',
      sourceUrl: 'https://brooklynbowl.com/events',
      maxEvents: 10,
      model: 'llama3.2:3b',
      host: 'http://localhost:11434'
    });

    console.log(`\n✅ Extraction completed!`);
    console.log(`Events found: ${result.events.length}`);
    console.log(`Confidence: ${result.confidence}\n`);

    if (result.events.length > 0) {
      console.log('Extracted events:');
      result.events.forEach((event, idx) => {
        console.log(`\n${idx + 1}. ${event.title}`);
        console.log(`   Date: ${event.startTime}`);
        console.log(`   Venue: ${event.venueName || 'N/A'}`);
        console.log(`   Price: $${event.priceMin || 0} - $${event.priceMax || 0}`);
        console.log(`   Category: ${event.category || 'N/A'}`);
      });
    } else {
      console.log('⚠️  No events extracted');
      if (result.rawResponse) {
        console.log('\nRaw response:');
        console.log(result.rawResponse.slice(0, 500));
      }
    }
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

testOllamaExtraction();
