import { CrawlState } from '@citypass/types';
import { retryWithBackoff } from '@citypass/utils';

/**
 * Crawl URLs using Firecrawl API
 */
export async function crawlWithFirecrawl(state: CrawlState): Promise<Partial<CrawlState>> {
  console.log(`🔥 Crawling with Firecrawl: ${state.urls.length} URLs`);

  const rawPages: any[] = [];
  const processedUrls: string[] = [];
  const errors: string[] = [...state.errors];
  let shouldRetry = false;
  let shouldSwitchMethod = false;

  for (const url of state.urls) {
    try {
      await retryWithBackoff(async () => {
        const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`,
          },
          body: JSON.stringify({
            url,
            pageOptions: {
              onlyMainContent: true,
            },
          }),
        });

        if (!response.ok) {
          if (response.status === 402 || response.status === 429) {
            // Rate limited or out of credits - switch to Apify
            console.log('⚠️  Firecrawl rate limit - switching to Apify');
            shouldSwitchMethod = true;
            shouldRetry = true;
            throw new Error('Rate limited');
          }

          throw new Error(`Firecrawl failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success) {
          rawPages.push({
            url,
            html: data.data.html || '',
            markdown: data.data.markdown || '',
          });
          processedUrls.push(url);
          console.log(`✅ Crawled: ${url}`);
        }
      });
    } catch (error: any) {
      console.error(`❌ Failed to crawl ${url}:`, error.message);
      errors.push(`${url}: ${error.message}`);
    }
  }

  return {
    rawPages: [...state.rawPages, ...rawPages],
    processedUrls: [...state.processedUrls, ...processedUrls],
    errors,
    shouldRetry,
    shouldSwitchMethod,
  };
}
