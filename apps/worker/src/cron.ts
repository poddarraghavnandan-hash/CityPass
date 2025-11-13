/**
 * Worker: Cron job scheduler
 * Schedules periodic jobs for graph refresh and social indexing
 */

import { refreshSimilarityEdges } from './graph/refresh-similarity';
import { embedAndIndexSocial } from './social/embed-index';
import { ensureSeedInventory } from './seedJob';
import { processIngestionQueue } from './ingestionQueueJob';

interface CronJob {
  name: string;
  intervalMs: number;
  handler: () => Promise<any>;
  lastRun?: number;
}

const jobs: CronJob[] = [
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
  {
    name: 'social-embed-index',
    intervalMs: 15 * 60 * 1000, // 15 minutes
    handler: embedAndIndexSocial,
  },
  {
    name: 'graph-similarity-refresh',
    intervalMs: 24 * 60 * 60 * 1000, // 24 hours
    handler: refreshSimilarityEdges,
  },
];

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
