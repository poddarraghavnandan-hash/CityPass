import { StateGraph, END } from '@langchain/langgraph';
import { CrawlState } from '@citypass/types';
import { discoverUrls } from './nodes/discover';
import { crawlWithFirecrawl } from './nodes/crawl-firecrawl';
import { crawlWithApify } from './nodes/crawl-apify';
import { extractEvents } from './nodes/extract';
import { validateEvents } from './nodes/validate';
import { geocodeEvents } from './nodes/geocode';
import { upsertEvents } from './nodes/upsert';

/**
 * Decision: Which crawl method to use?
 */
function decideCrawlMethod(state: CrawlState): string {
  if (state.shouldSwitchMethod) {
    console.log('🔄 Switching crawl method');
    return state.crawlMethod === 'FIRECRAWL' ? 'crawl_apify' : 'crawl_firecrawl';
  }

  return state.crawlMethod === 'FIRECRAWL' ? 'crawl_firecrawl' : 'crawl_apify';
}

/**
 * Decision: Should we retry?
 */
function shouldRetry(state: CrawlState): string {
  if (state.shouldRetry && state.errors.length < 3) {
    console.log('🔁 Retrying with different method');
    return 'discover';
  }

  if (state.rawPages.length === 0) {
    console.log('❌ No pages crawled, ending');
    return END;
  }

  return 'extract';
}

/**
 * Decision: Continue processing?
 */
function shouldContinue(state: CrawlState): string {
  if (state.extractedEvents.length === 0) {
    console.log('ℹ️  No events extracted');
    return END;
  }

  return 'validate';
}

/**
 * Create the agentic workflow graph
 */
export function createCrawlGraph() {
  const workflow = new StateGraph<CrawlState>({
    channels: {
      sourceId: {
        value: (left?: string, right?: string) => right ?? left ?? '',
      },
      sourceUrl: {
        value: (left?: string, right?: string) => right ?? left ?? '',
      },
      sourceDomain: {
        value: (left?: string, right?: string) => right ?? left ?? '',
      },
      city: {
        value: (left?: string, right?: string) => right ?? left ?? '',
      },
      crawlMethod: {
        value: (left?: 'FIRECRAWL' | 'APIFY', right?: 'FIRECRAWL' | 'APIFY') =>
          right ?? left ?? 'FIRECRAWL',
      },
      urls: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      processedUrls: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      rawPages: {
        value: (left?: any[], right?: any[]) => right ?? left ?? [],
      },
      extractedEvents: {
        value: (left?: any[], right?: any[]) => right ?? left ?? [],
      },
      errors: {
        value: (left?: string[], right?: string[]) => right ?? left ?? [],
      },
      shouldRetry: {
        value: (left?: boolean, right?: boolean) => right ?? left ?? false,
      },
      shouldSwitchMethod: {
        value: (left?: boolean, right?: boolean) => right ?? left ?? false,
      },
    },
  });

  // Add nodes
  workflow.addNode('discover', discoverUrls);
  workflow.addNode('crawl_firecrawl', crawlWithFirecrawl);
  workflow.addNode('crawl_apify', crawlWithApify);
  workflow.addNode('extract', extractEvents);
  workflow.addNode('validate', validateEvents);
  workflow.addNode('geocode', geocodeEvents);
  workflow.addNode('upsert', upsertEvents);

  // Set entry point
  workflow.setEntryPoint('discover');

  // Add edges
  workflow.addConditionalEdges('discover', decideCrawlMethod, {
    crawl_firecrawl: 'crawl_firecrawl',
    crawl_apify: 'crawl_apify',
  });

  workflow.addConditionalEdges('crawl_firecrawl', shouldRetry, {
    discover: 'discover',
    extract: 'extract',
    [END]: END,
  });

  workflow.addConditionalEdges('crawl_apify', shouldRetry, {
    discover: 'discover',
    extract: 'extract',
    [END]: END,
  });

  workflow.addConditionalEdges('extract', shouldContinue, {
    validate: 'validate',
    [END]: END,
  });

  workflow.addEdge('validate', 'geocode');
  workflow.addEdge('geocode', 'upsert');
  workflow.addEdge('upsert', END);

  return workflow.compile();
}
