/**
 * Quality Check Node
 * Performs sanity checks and identifies anomalies
 */

import type { CityIngestionContext, QualityCheckResult } from '../types';
import { prisma } from '@citypass/db';

/**
 * Perform quality checks on ingestion results
 */
export async function qualityCheck(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[QualityCheckAgent] Running quality checks...`);

  const warnings: string[] = [];
  const anomalies: string[] = [];

  // Check 1: Zero venues from a previously working source
  if (context.stats.osmVenues === 0) {
    anomalies.push('OSM returned 0 venues (expected >0)');
  }

  // Check 2: Low coordinate coverage
  const coordCoverage = context.stats.venuesWithCoords / Math.max(context.stats.normalizedTotal, 1);
  if (coordCoverage < 0.5) {
    warnings.push(`Only ${Math.round(coordCoverage * 100)}% of venues have coordinates`);
  }

  // Check 3: Too many uncategorized venues
  const categoryCoverage =
    context.stats.venuesWithCategory / Math.max(context.stats.normalizedTotal, 1);
  if (categoryCoverage < 0.7) {
    warnings.push(`Only ${Math.round(categoryCoverage * 100)}% of venues have category != OTHER`);
  }

  // Check 4: Compare against previous runs
  const previousRuns = await prisma.ingestionRun.findMany({
    where: {
      city: context.city.name,
      status: 'SUCCESS',
    },
    orderBy: { startedAt: 'desc' },
    take: 5,
  });

  if (previousRuns.length > 0) {
    const lastRun = previousRuns[0];
    const lastStats = lastRun.statsJson as any;

    if (lastStats) {
      // Significant drop in venues
      if (context.stats.rawTotal < lastStats.rawTotal * 0.5) {
        anomalies.push(
          `Venue count dropped significantly: ${context.stats.rawTotal} vs ${lastStats.rawTotal} last run`
        );
      }
    }
  }

  // Compute scores
  const coverageScore = Math.round(coordCoverage * 100);
  const qualityScore = Math.round(
    (categoryCoverage * 50 + coordCoverage * 30 + (context.stats.venuesWithWebsite / Math.max(context.stats.normalizedTotal, 1)) * 20)
  );
  const completenessScore = Math.round(
    ((context.stats.osmVenues > 0 ? 25 : 0) +
      (context.stats.foursquareVenues > 0 ? 25 : 0) +
      (context.stats.yelpVenues > 0 ? 25 : 0) +
      (context.stats.eventSiteVenues > 0 ? 25 : 0))
  );

  const result: QualityCheckResult = {
    passed: anomalies.length === 0,
    warnings,
    anomalies,
    metrics: {
      coverageScore,
      qualityScore,
      completenessScore,
    },
  };

  console.log(`[QualityCheckAgent] Coverage: ${coverageScore}%, Quality: ${qualityScore}%, Completeness: ${completenessScore}%`);
  if (warnings.length > 0) {
    console.warn(`[QualityCheckAgent] Warnings:`, warnings);
  }
  if (anomalies.length > 0) {
    console.error(`[QualityCheckAgent] Anomalies:`, anomalies);
  }

  // Add to context errors if there are anomalies
  for (const anomaly of anomalies) {
    context.errors.push({
      agentName: 'QualityCheckAgent',
      source: 'SYSTEM',
      message: anomaly,
      timestamp: new Date(),
    });
  }

  return context;
}
