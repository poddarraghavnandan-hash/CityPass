import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from monorepo root (go up 3 levels: src -> worker -> apps -> root)
const envPath = resolve(__dirname, '../../../.env');
const result = config({ path: envPath });
console.log(`[Worker] Loading .env from: ${envPath}`);
console.log(`[Worker] Loaded ${Object.keys(result.parsed || {}).length} environment variables`);
console.log(`[Worker] OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);

import { prisma } from '@citypass/db';
import { CrawlState } from '@citypass/types';
import { extractDomain } from '@citypass/utils';
import { resetOpenAIClient } from '@citypass/llm';
import { createCrawlGraph } from './graph';

// Reset OpenAI client singleton to pick up the API key from .env
resetOpenAIClient();

const graph = createCrawlGraph();

/**
 * Process a single source
 */
async function processSource(sourceId: string) {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  });

  if (!source || !source.active) {
    console.log(`⏭️  Skipping inactive source: ${sourceId}`);
    return;
  }

  console.log(`\n🚀 Processing source: ${source.name}`);

  const initialState: CrawlState = {
    sourceId: source.id,
    sourceUrl: source.url,
    sourceDomain: source.domain,
    city: source.city,
    crawlMethod: source.crawlMethod as 'FIRECRAWL' | 'APIFY',
    urls: [],
    processedUrls: [],
    rawPages: [],
    extractedEvents: [],
    errors: [],
    shouldRetry: false,
    shouldSwitchMethod: false,
  };

  try {
    await graph.invoke(initialState);
    console.log(`✅ Completed source: ${source.name}`);
  } catch (error) {
    console.error(`❌ Failed source: ${source.name}`, error);
  }
}

/**
 * Main worker loop
 */
async function main() {
  console.log('👷 CityPass Worker starting...');

  // Fetch all active sources
  const sources = await prisma.source.findMany({
    where: {
      active: true,
    },
    orderBy: {
      lastCrawled: 'asc',
    },
  });

  console.log(`📋 Found ${sources.length} active sources`);

  // Process each source sequentially
  for (const source of sources) {
    await processSource(source.id);

    // Sleep between sources to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('✅ Worker cycle complete');
}

// Run worker
if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { processSource };
