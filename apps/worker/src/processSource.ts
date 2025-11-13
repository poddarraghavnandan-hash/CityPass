import { prisma } from '@citypass/db';
import { CrawlState } from '@citypass/types';
import { createCrawlGraph } from './graph';

const graph = createCrawlGraph();

export async function processSource(sourceId: string) {
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
