#!/usr/bin/env node
/**
 * Extract events from all configured sources
 * Uses Firecrawl scraping + LLM extraction (OpenAI → Claude → Ollama → HuggingFace)
 */

import { processAllSources } from '../apps/web/src/lib/event-crawler';

async function main() {
  console.log('🚀 Starting event extraction from all sources...\n');
  console.log('📍 Database: Nhost Production');
  console.log('🔄 LLM Fallback: OpenAI → Claude → Ollama → HuggingFace\n');

  try {
    const result = await processAllSources();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 EXTRACTION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Sources processed: ${result.totalProcessed}`);
    console.log(`Events created: ${result.totalEventsCreated}`);
    console.log(`Failures: ${result.failures.length}\n`);

    if (result.failures.length > 0) {
      console.log('❌ Failed sources:');
      result.failures.forEach((failure) => {
        console.log(`  • ${failure}`);
      });
    }

    if (result.totalEventsCreated > 0) {
      console.log('\n✅ SUCCESS! Events are now in the database.');
      console.log('🎉 You can now test the chat/search functionality!');
    } else {
      console.log('\n⚠️  No events were created. Check errors above.');
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
