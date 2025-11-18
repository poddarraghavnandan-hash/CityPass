/**
 * Worker: Cron job scheduler
 * Schedules periodic jobs for graph refresh and social indexing
 */

import { ensureSeedInventory } from './seedJob';
import { processIngestionQueue } from './ingestionQueueJob';
import { runVenueIngestionForAllCities } from './venueIngestion';
import { runEventExtraction } from './eventExtractionJob';

// Optional imports - gracefully handle if modules don't compile
let refreshSimilarityEdges: (() => Promise<any>) | undefined;
let embedAndIndexSocial: (() => Promise<any>) | undefined;
let runScraperCycle: (() => Promise<any>) | undefined;
let updateTasteVectors: ((hours?: number) => Promise<any>) | undefined;
let updateBanditPolicies: ((hours?: number) => Promise<any>) | undefined;
let trainRanker: (() => Promise<any>) | undefined;
let processAllSources: (() => Promise<any>) | undefined;

try {
  const graphModule = require('./graph/refresh-similarity');
  refreshSimilarityEdges = graphModule.refreshSimilarityEdges;
} catch (e) {
  console.warn('Graph similarity module not available');
}

try {
  const socialModule = require('./social/embed-index');
  embedAndIndexSocial = socialModule.embedAndIndexSocial;
} catch (e) {
  console.warn('Social embedding module not available');
}

try {
  const scraperModule = require('./scrape/schedule');
  runScraperCycle = scraperModule.runScraperCycle;
} catch (e) {
  console.warn('Scraper module not available');
}

try {
  const learnerModule = require('./learner');
  updateTasteVectors = learnerModule.updateTasteVectors;
  updateBanditPolicies = learnerModule.updateBanditPolicies;
  trainRanker = learnerModule.trainRanker;
} catch (e) {
  console.warn('Learner module not available:', e);
}

try {
  // Import the new Firecrawl + Ollama extraction system
  const crawlerModule = require('../../web/src/lib/event-crawler');
  processAllSources = crawlerModule.processAllSources;
} catch (e) {
  console.warn('Event crawler module not available:', e);
}

interface CronJob {
  name: string;
  intervalMs: number;
  handler: () => Promise<any>;
  lastRun?: number;
}

const jobs: CronJob[] = [
  // Continuous Event Extraction (Ollama + HuggingFace - NO OpenAI)
  {
    name: 'event-extraction',
    intervalMs: parseInt(process.env.EVENT_EXTRACTION_INTERVAL ?? String(2 * 60 * 60 * 1000), 10), // Every 2 hours
    handler: runEventExtraction,
  },
  // Venue Knowledge Graph Ingestion - FULL run (weekly)
  {
    name: 'venue-ingestion-full',
    intervalMs: parseInt(process.env.VENUE_INGESTION_FULL_INTERVAL ?? String(7 * 24 * 60 * 60 * 1000), 10), // Weekly
    handler: () => runVenueIngestionForAllCities('FULL'),
  },
  // Venue Knowledge Graph Ingestion - INCREMENTAL run (hourly)
  {
    name: 'venue-ingestion-incremental',
    intervalMs: parseInt(process.env.VENUE_INGESTION_INCREMENTAL_INTERVAL ?? String(60 * 60 * 1000), 10), // Hourly
    handler: () => runVenueIngestionForAllCities('INCREMENTAL'),
  },
  // New Firecrawl + Ollama extraction for direct venue scraping
  processAllSources && {
    name: 'extract-venue-events',
    intervalMs: parseInt(process.env.EXTRACT_INTERVAL ?? String(60 * 60 * 1000), 10), // 60 minutes (hourly)
    handler: processAllSources,
  },
  // Legacy Apify-based scraping (Eventbrite, Meetup, ResidentAdvisor)
  runScraperCycle && {
    name: 'scrape-events',
    intervalMs: parseInt(process.env.SCRAPE_INTERVAL ?? String(60 * 60 * 1000), 10), // 60 minutes (hourly scraping)
    handler: runScraperCycle,
  },
  {
    name: 'seed-events',
    intervalMs: parseInt(process.env.CITYLENS_SEED_INTERVAL ?? String(10 * 60 * 1000), 10),
    handler: ensureSeedInventory,
  },
  {
    name: 'ingestion-queue',
    intervalMs: parseInt(process.env.CITYLENS_QUEUE_INTERVAL ?? String(60 * 1000), 10),
    handler: processIngestionQueue,
  },
  embedAndIndexSocial && {
    name: 'social-embed-index',
    intervalMs: 15 * 60 * 1000, // 15 minutes
    handler: embedAndIndexSocial,
  },
  refreshSimilarityEdges && {
    name: 'graph-similarity-refresh',
    intervalMs: 24 * 60 * 60 * 1000, // 24 hours
    handler: refreshSimilarityEdges,
  },
  // Learning system tasks
  updateTasteVectors && {
    name: 'update-taste-vectors',
    intervalMs: 15 * 60 * 1000, // 15 minutes
    handler: () => updateTasteVectors(24), // Process last 24 hours
  },
  updateBanditPolicies && {
    name: 'update-bandit-policies',
    intervalMs: 60 * 60 * 1000, // 1 hour
    handler: () => updateBanditPolicies(24), // Analyze last 24 hours
  },
  trainRanker && {
    name: 'train-ranker',
    intervalMs: 24 * 60 * 60 * 1000, // 24 hours (daily training)
    handler: trainRanker,
  },
].filter(Boolean) as CronJob[];

/**
 * Start cron scheduler
 */
export function startCron(): void {
  console.log('⏰ Starting cron scheduler...');

  jobs.forEach(job => {
    // Run immediately on start
    runJob(job);

    // Schedule recurring runs
    setInterval(() => {
      runJob(job);
    }, job.intervalMs);

    console.log(`  ✓ Scheduled: ${job.name} (every ${job.intervalMs / 1000}s)`);
  });
}

/**
 * Run a single job with error handling
 */
async function runJob(job: CronJob): Promise<void> {
  const now = Date.now();

  console.log(`\n🚀 [${new Date().toISOString()}] Running job: ${job.name}`);

  try {
    const result = await job.handler();
    job.lastRun = now;

    console.log(`✅ [${new Date().toISOString()}] Job completed: ${job.name}`);
    console.log(`   Result:`, result);
  } catch (error: any) {
    console.error(`❌ [${new Date().toISOString()}] Job failed: ${job.name}`);
    console.error(`   Error:`, error.message);
  }
}

/**
 * Stop cron scheduler (graceful shutdown)
 */
export function stopCron(): void {
  console.log('⏹️ Stopping cron scheduler...');
  // In a real implementation, we'd clear intervals here
  // For now, this is a placeholder for graceful shutdown
}

/**
 * Run a specific job on demand
 */
export async function runJobByName(jobName: string): Promise<any> {
  const job = jobs.find(j => j.name === jobName);

  if (!job) {
    throw new Error(`Job not found: ${jobName}`);
  }

  return runJob(job);
}

/**
 * Get job status
 */
export function getJobStatus(): Array<{
  name: string;
  intervalMs: number;
  lastRun: number | null;
  nextRun: number | null;
}> {
  return jobs.map(job => ({
    name: job.name,
    intervalMs: job.intervalMs,
    lastRun: job.lastRun || null,
    nextRun: job.lastRun ? job.lastRun + job.intervalMs : null,
  }));
}
