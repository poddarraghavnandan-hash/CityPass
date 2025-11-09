import { describe, it, expect } from '@jest/globals';
import { launch } from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { getTestBaseUrl, requireEnv } from '../helpers/env';

declare module 'jest' {
  interface Matchers<R> {
    toBeLessThanOrEqual(received: number): R;
  }
}

const baseUrl = getTestBaseUrl();
const runSuite = baseUrl ? describe : describe.skip;

if (!baseUrl) {
  console.warn('CITYLENS_TEST_BASE_URL is not set – skipping Lighthouse tests.');
}

runSuite('CityLens Lighthouse budget', () => {
  const city = process.env.STAGING_CITY || 'New_York';
  const ids = process.env.STAGING_STABLE_EVENT_IDS || '';
  const targetUrl = `${baseUrl}/feed?city=${encodeURIComponent(city)}&mood=electric&ids=${encodeURIComponent(ids)}`;

  it('meets mobile performance thresholds', async () => {
    if (!requireEnv(['STAGING_CITY'], 'CityLens perf')) {
      return;
    }

    const chrome = await launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    try {
      const runnerResult = await lighthouse(
        targetUrl,
        {
          port: chrome.port,
          output: 'json',
          disableStorageReset: true,
          onlyCategories: ['performance'],
          throttling: {
            rttMs: 70,
            throughputKbps: 1500,
            cpuSlowdownMultiplier: 4,
            downloadThroughputKbps: 1500,
            uploadThroughputKbps: 750,
          },
        },
        {
          extends: 'lighthouse:default',
          settings: {
            formFactor: 'mobile',
            screenEmulation: {
              mobile: true,
              width: 360,
              height: 640,
              deviceScaleFactor: 2.625,
              disabled: false,
            },
          },
        }
      );

      const audits = runnerResult.lhr.audits;
      expect(audits['largest-contentful-paint'].numericValue).toBeLessThanOrEqual(2500);
      expect(audits['total-blocking-time'].numericValue).toBeLessThanOrEqual(350);
      expect(audits['cumulative-layout-shift'].numericValue).toBeLessThanOrEqual(0.05);
    } finally {
      await chrome.kill();
    }
  }, 120000);
});
