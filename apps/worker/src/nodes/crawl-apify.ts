import { CrawlState } from '@citypass/types';
import { ApifyClient } from 'apify-client';

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_KEY,
});

/**
 * Crawl URLs using Apify (Web Scraper actor)
 */
export async function crawlWithApify(state: CrawlState): Promise<Partial<CrawlState>> {
  console.log(`🐝 Crawling with Apify: ${state.urls.length} URLs`);

  const rawPages: any[] = [];
  const processedUrls: string[] = [];
  const errors: string[] = [...state.errors];

  try {
    // Run the Web Scraper actor
    const run = await apifyClient.actor('apify/web-scraper').call({
      startUrls: state.urls.map((url) => ({ url })),
      pageFunction: `async function pageFunction(context) {
        return {
          url: context.request.url,
          html: context.body,
        };
      }`,
    });

    // Wait for results
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    for (const item of items) {
      rawPages.push({
        url: item.url,
        html: item.html || '',
      });
      processedUrls.push(item.url);
    }

    console.log(`✅ Apify crawled ${items.length} pages`);
  } catch (error: any) {
    console.error('❌ Apify crawl failed:', error.message);
    errors.push(`Apify: ${error.message}`);
  }

  return {
    rawPages: [...state.rawPages, ...rawPages],
    processedUrls: [...state.processedUrls, ...processedUrls],
    errors,
  };
}
