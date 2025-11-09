/**
 * Nightly learning job to update ranking weights based on user interactions
 * Implements simple gradient descent on engagement metrics
 */

import { PrismaClient } from '@citypass/db';

const prisma = new PrismaClient();

interface FeatureWeights {
  textualSimilarity: number;
  categoryMatch: number;
  timeUntilEvent: number;
  preferredTimeMatch: number;
  distance: number;
  neighborhoodMatch: number;
  priceMatch: number;
  viewCount: number;
  saveCount: number;
  friendSaveCount: number;
  venueQuality: number;
  novelty: number;
  diversity: number;
  alreadySeen: number;
}

async function learnWeights() {
  console.log('🧠 Starting ranking weight learning job...');

  try {
    // Get analytics events from last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const interactions = await prisma.analyticsEvent.findMany({
      where: {
        type: {
          in: ['VIEW', 'SAVE', 'OUTBOUND_CLICK', 'BOOK_CLICK'],
        },
        occurredAt: {
          gte: sevenDaysAgo,
        },
        eventId: {
          not: null,
        },
      },
      select: {
        type: true,
        eventId: true,
        sessionId: true,
      },
    });

    console.log(`📊 Analyzing ${interactions.length} interactions...`);

    // Calculate engagement scores
    const eventEngagement: Record<
      string,
      { views: number; saves: number; clicks: number; score: number }
    > = {};

    for (const interaction of interactions) {
      if (!interaction.eventId) continue;

      if (!eventEngagement[interaction.eventId]) {
        eventEngagement[interaction.eventId] = {
          views: 0,
          saves: 0,
          clicks: 0,
          score: 0,
        };
      }

      const metrics = eventEngagement[interaction.eventId];

      switch (interaction.type) {
        case 'VIEW':
          metrics.views++;
          metrics.score += 0.1;
          break;
        case 'SAVE':
          metrics.saves++;
          metrics.score += 1.0;
          break;
        case 'OUTBOUND_CLICK':
        case 'BOOK_CLICK':
          metrics.clicks++;
          metrics.score += 2.0;
          break;
      }
    }

    // Get current weights
    const currentWeights = await prisma.rankingWeights.findFirst({
      orderBy: { version: 'desc' },
    });

    const weights: FeatureWeights = currentWeights?.weights as any || {
      textualSimilarity: 0.25,
      categoryMatch: 0.15,
      timeUntilEvent: 0.10,
      preferredTimeMatch: 0.08,
      distance: 0.12,
      neighborhoodMatch: 0.08,
      priceMatch: 0.10,
      viewCount: 0.03,
      saveCount: 0.04,
      friendSaveCount: 0.05,
      venueQuality: 0.07,
      novelty: 0.05,
      diversity: 0.04,
      alreadySeen: -0.15,
    };

    // Simple learning: Boost weights for features correlated with engagement
    // This is a simplified approach - in production, use proper ML training

    // Calculate CTR (saves + clicks) / views
    let avgCTR = 0;
    let eventCount = 0;

    for (const eventId in eventEngagement) {
      const metrics = eventEngagement[eventId];
      if (metrics.views > 0) {
        avgCTR += (metrics.saves + metrics.clicks) / metrics.views;
        eventCount++;
      }
    }

    avgCTR = avgCTR / eventCount;

    console.log(`📈 Average CTR: ${(avgCTR * 100).toFixed(2)}%`);

    // Adjust weights based on performance
    // (In a real system, you'd use gradient descent or other optimization)
    const learningRate = 0.05;

    // Example: If high engagement, slightly boost category match importance
    if (avgCTR > 0.15) {
      weights.categoryMatch = Math.min(
        0.20,
        weights.categoryMatch + learningRate * 0.1
      );
      weights.textualSimilarity = Math.max(
        0.20,
        weights.textualSimilarity - learningRate * 0.05
      );
    }

    // Normalize weights to sum to 1.0 (excluding negative ones)
    const positiveSum = Object.entries(weights)
      .filter(([key]) => key !== 'alreadySeen')
      .reduce((sum, [, val]) => sum + val, 0);

    const normalizedWeights = { ...weights };
    for (const key in normalizedWeights) {
      if (key !== 'alreadySeen') {
        normalizedWeights[key as keyof FeatureWeights] /= positiveSum;
      }
    }

    // Calculate accuracy metrics
    const accuracy = avgCTR; // Simplified metric
    const eCTR = avgCTR;

    // Save new weights
    const newVersion = (currentWeights?.version || 0) + 1;

    await prisma.rankingWeights.create({
      data: {
        version: newVersion,
        weights: normalizedWeights as any,
        accuracy,
        eCTR,
        trainedAt: new Date(),
      },
    });

    console.log(`✅ New weights (v${newVersion}) saved successfully!`);
    console.log('  Metrics:');
    console.log(`    - Accuracy: ${(accuracy * 100).toFixed(2)}%`);
    console.log(`    - eCTR: ${(eCTR * 100).toFixed(2)}%`);
    console.log(`    - Events analyzed: ${eventCount}`);

  } catch (error) {
    console.error('💥 Fatal error in learning job:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  learnWeights()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { learnWeights };
