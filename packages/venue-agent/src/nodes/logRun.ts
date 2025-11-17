/**
 * Log Run Node
 * Creates and updates ingestion run records
 */

import type { CityIngestionContext } from '../types';
import { prisma } from '@citypass/db';

/**
 * Create ingestion run record (call at start)
 */
export async function createIngestionRun(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[LogRunAgent] Creating ingestion run for ${context.city.name}...`);

  const run = await prisma.ingestionRun.create({
    data: {
      runType: context.runType,
      city: context.city.name,
      status: 'RUNNING',
      startedAt: context.stats.startTime,
    },
  });

  context.ingestionRunId = run.id;

  console.log(`[LogRunAgent] Created run ${run.id}`);

  return context;
}

/**
 * Update ingestion run record (call at end)
 */
export async function finalizeIngestionRun(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[LogRunAgent] Finalizing ingestion run ${context.ingestionRunId}...`);

  const endTime = new Date();
  context.stats.endTime = endTime;
  context.stats.durationMs = endTime.getTime() - context.stats.startTime.getTime();

  // Determine status
  const status = context.errors.length > 0 ? 'PARTIAL' : 'SUCCESS';

  // Update run
  await prisma.ingestionRun.update({
    where: { id: context.ingestionRunId },
    data: {
      status,
      finishedAt: endTime,
      statsJson: context.stats as any,
    },
  });

  // Create error records
  for (const error of context.errors) {
    await prisma.ingestionError.create({
      data: {
        ingestionRunId: context.ingestionRunId,
        agentName: error.agentName,
        source: error.source,
        message: error.message,
        payload: error.payload as any,
      },
    });
  }

  console.log(`[LogRunAgent] Run ${context.ingestionRunId} finalized with status: ${status}`);
  console.log(`[LogRunAgent] Duration: ${context.stats.durationMs}ms`);
  console.log(`[LogRunAgent] Stats:`, context.stats);

  return context;
}
