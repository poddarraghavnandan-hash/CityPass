/**
 * Quick script to index seeded events in Typesense
 */

import { indexEventsInTypesense } from './apps/worker/src/scrape/indexing';

async function main() {
  console.log('🔍 Indexing events in Typesense...');

  try {
    const count = await indexEventsInTypesense('New York', {
      batchSize: 100,
      deleteOld: false,
    });

    console.log(`✅ Successfully indexed ${count} events!`);
  } catch (error) {
    console.error('❌ Indexing failed:', error);
    process.exit(1);
  }
}

main();
