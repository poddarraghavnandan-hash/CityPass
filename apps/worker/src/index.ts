import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from monorepo root (go up 3 levels: src -> worker -> apps -> root)
// IMPORTANT: Load env BEFORE any imports that use Prisma
const envPath = resolve(__dirname, '../../../.env');
const result = config({ path: envPath, override: true });
console.log(`[Worker] Loading .env from: ${envPath}`);
console.log(`[Worker] Loaded ${Object.keys(result.parsed || {}).length} environment variables`);
console.log(`[Worker] OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);
console.log(`[Worker] DATABASE_URL present: ${!!process.env.DATABASE_URL}`);
console.log(`[Worker] DATABASE_URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);

// Now import Prisma after env is loaded
import { prisma } from '@citypass/db';
import { startCron } from './cron';
import { processSource } from './processSource';

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

if (require.main === module) {
  startCron();
  main()
    .then(() => console.log('🏁 Initial crawl finished'))
    .catch((error) => console.error('Worker startup failed', error));

  const shutdown = async () => {
    console.log('👋 Shutting down worker...');
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
