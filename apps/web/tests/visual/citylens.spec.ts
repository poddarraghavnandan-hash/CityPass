import path from 'node:path';
import fs from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { chromium, Browser, Page } from 'playwright';
import { getTestBaseUrl, requireEnv } from '../helpers/env';

declare module 'jest' {
  interface Matchers<R> {
    toMatchImageSnapshot(): R;
  }
}

const SNAPSHOT_DIR = path.join(__dirname, '__image_snapshots__');
const REQUIRED = ['STAGING_CITY', 'STAGING_STABLE_EVENT_IDS'];

const baseUrl = getTestBaseUrl();
const snapshotsEnabled = process.env.CITYLENS_SNAPSHOTS_DISABLED !== 'true';
const runSuite = baseUrl && snapshotsEnabled ? describe : describe.skip;

if (!baseUrl) {
  console.warn('CITYLENS_TEST_BASE_URL is not set – skipping visual tests.');
}

if (!snapshotsEnabled) {
  console.warn('jest-image-snapshot unavailable – skipping visual tests.');
}

runSuite('CityLens visual regressions', () => {
  let browser: Browser;
  let page: Page;
  let canRun = true;

  beforeAll(async () => {
    if (!requireEnv(REQUIRED, 'CityLens visual')) {
      canRun = false;
      return;
    }

    if (!fs.existsSync(SNAPSHOT_DIR)) {
      fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }

    browser = await chromium.launch({ headless: true });
    page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  }, 30000);

  afterAll(async () => {
    await page?.close();
    await browser?.close();
  });

  const city = process.env.STAGING_CITY || 'New_York';
  const ids = process.env.STAGING_STABLE_EVENT_IDS || '';
  const feedUrl = `${baseUrl}/feed?city=${encodeURIComponent(city)}&mood=electric&ids=${encodeURIComponent(ids)}`;

  async function snap(label: string) {
    const buffer = await page.screenshot({ fullPage: true });
    const shouldUpdate = process.env.CITYLENS_UPDATE_SNAPSHOTS === 'true';
    try {
      expect(buffer).toMatchImageSnapshot({
        customSnapshotsDir: SNAPSHOT_DIR,
        customSnapshotIdentifier: `citylens-${label}`,
        failureThresholdType: 'percent',
        failureThreshold: 0.02,
      });
    } catch (error: any) {
      if (!shouldUpdate && /Snapshot .* was not found/.test(String(error?.message))) {
        console.warn(`Snapshot missing for ${label}. Run CITYLENS_UPDATE_SNAPSHOTS=true to record baselines.`);
        return;
      }
      throw error;
    }
  }

  it('captures home feed, mood shift, and modal context', async () => {
    if (!canRun) {
      return;
    }

    await page.goto(feedUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    await snap('home-feed');

    // Mood shift
    await page.getByRole('tab', { name: /Social/i }).click();
    await page.waitForTimeout(2000);
    await snap('mood-shift');

    // Context modal capture
    await page.getByRole('button', { name: /Expand/i }).first().click();
    await page.waitForSelector('[role="dialog"]');
    await page.waitForTimeout(1500);
    await snap('context-modal');

    // Plan & circles region
    const modal = await page.$('[role="dialog"]');
    if (modal) {
      const modalShot = await modal.screenshot();
      expect(modalShot).toMatchImageSnapshot({
        customSnapshotsDir: SNAPSHOT_DIR,
        customSnapshotIdentifier: 'citylens-plan-circles',
        failureThresholdType: 'percent',
        failureThreshold: 0.02,
      });
    }
  }, 90000);
});
