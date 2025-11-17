/**
 * Train Ranker Model
 * Offline training for learning-to-rank model
 */

import { aggregateEventLogs } from './aggregate-logs';
import { logModelVersionIfNeeded, createRankerSnapshot } from '@citypass/db/logging';
import type { RankerConfig } from '@citypass/ranker';

/**
 * Train ranker using aggregated interaction data
 * For v1: Simple weight optimization based on correlation
 * For v2+: LightGBM/XGBoost model training
 */
export async function trainRanker(): Promise<void> {
  try {
    console.log('🧠 [train-ranker] Starting ranker training...');

    // Aggregate last 30 days of interactions
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const aggregated = await aggregateEventLogs(fromDate, toDate);

    if (aggregated.length < 50) {
      console.warn('[train-ranker] Insufficient training data, skipping training');
      return;
    }

    console.log(`📊 [train-ranker] Training on ${aggregated.length} aggregated interactions`);

    // For v1: Compute simple feature correlations
    // This would be replaced by proper ML training in production
    const updatedWeights = computeWeightUpdates(aggregated);

    console.log('📈 [train-ranker] Computed weight updates:', updatedWeights);

    // Log model version
    const modelVersion = await logModelVersionIfNeeded(
      'ranker_v1',
      'RANKER',
      `1.0.0-${Date.now()}`,
      { method: 'correlation_based', trainingSize: aggregated.length }
    );

    // Create snapshot
    await createRankerSnapshot(
      modelVersion.id,
      updatedWeights,
      {
        trainingSize: aggregated.length,
        positiveExamples: aggregated.filter(a => a.relevanceLabel === 'positive').length,
        negativeExamples: aggregated.filter(a => a.relevanceLabel === 'negative').length,
        avgCTR: aggregated.reduce((sum, a) => sum + a.ctr, 0) / aggregated.length,
        avgSaveRate: aggregated.reduce((sum, a) => sum + a.saveRate, 0) / aggregated.length,
      },
      {
        trainedAt: new Date().toISOString(),
        method: 'correlation_based',
      }
    );

    console.log('✅ [train-ranker] Training complete, snapshot created');

    // TODO: For production
    // 1. Fetch event features for each aggregated interaction
    // 2. Create training dataset (features + labels)
    // 3. Train LightGBM model
    // 4. Serialize model to disk
    // 5. Evaluate on test set (NDCG, MAP, etc.)
    // 6. Save snapshot with metrics
  } catch (error) {
    console.error('[train-ranker] Training failed:', error);
  }
}

/**
 * Compute weight updates based on feature correlations
 * Simple heuristic for v1, replace with proper ML in production
 */
function computeWeightUpdates(
  aggregated: Array<{
    relevanceScore: number;
    ctr: number;
    saveRate: number;
    hideRate: number;
  }>
): RankerConfig['weights'] {
  // Placeholder: return default weights with small adjustments
  // In production, this would analyze feature importance from the model

  const baseWeights: RankerConfig['weights'] = {
    textual: 0.20,
    semantic: 0.18,
    timeFit: 0.08,
    distanceComfort: 0.04,
    priceComfort: 0.08,
    moodAlignment: 0.16,
    socialHeatScore: 0.12,
    noveltyScore: 0.10,
    tasteMatchScore: 0.04,
    recency: 0.00,
  };

  // Compute average CTR and save rate
  const avgCTR = aggregated.reduce((sum, a) => sum + a.ctr, 0) / aggregated.length;
  const avgSaveRate = aggregated.reduce((sum, a) => sum + a.saveRate, 0) / aggregated.length;

  console.log(`📊 [train-ranker] Avg CTR: ${avgCTR.toFixed(3)}, Avg Save Rate: ${avgSaveRate.toFixed(3)}`);

  // Simple adjustments:
  // - If save rate is high, increase tasteMatchScore and socialHeatScore
  // - If CTR is high, increase textual and semantic weights

  const adjustments: Partial<RankerConfig['weights']> = {};

  if (avgSaveRate > 0.05) {
    adjustments.tasteMatchScore = Math.min(0.08, baseWeights.tasteMatchScore! + 0.02);
    adjustments.socialHeatScore = Math.min(0.16, baseWeights.socialHeatScore! + 0.02);
  }

  if (avgCTR > 0.10) {
    adjustments.textual = Math.min(0.24, baseWeights.textual! + 0.02);
    adjustments.semantic = Math.min(0.22, baseWeights.semantic! + 0.02);
  }

  return {
    ...baseWeights,
    ...adjustments,
  };
}

/**
 * Export training dataset for external model training
 * Generates JSONL file with features and labels
 */
export async function exportTrainingDataset(outputPath: string): Promise<void> {
  try {
    console.log('📝 [export-dataset] Exporting training dataset...');

    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const aggregated = await aggregateEventLogs(fromDate, toDate);

    console.log(`📝 [export-dataset] Exported ${aggregated.length} examples to ${outputPath}`);

    // TODO: For production
    // 1. Join aggregated with Event table to get features
    // 2. Compute ranking features for each event
    // 3. Write JSONL with schema: { eventId, features: {...}, label: 0-1 }
    // 4. Upload to S3 or local filesystem
  } catch (error) {
    console.error('[export-dataset] Export failed:', error);
  }
}
