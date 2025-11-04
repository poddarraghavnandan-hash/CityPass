import { CrawlState } from '@citypass/types';

/**
 * Discover URLs to crawl from the source
 * For now, just use the main source URL
 * Future: Check for sitemaps, pagination, etc.
 */
export async function discoverUrls(state: CrawlState): Promise<Partial<CrawlState>> {
  console.log(`🔍 Discovering URLs for ${state.sourceDomain}`);

  const urls = [state.sourceUrl];

  // TODO: Check for sitemap.xml
  // TODO: Detect pagination patterns

  console.log(`✅ Discovered ${urls.length} URLs`);

  return {
    urls,
    processedUrls: [],
  };
}
