/**
 * Update Bandit Policies
 * Analyze slate policy performance and adjust parameters
 */

import { prisma } from '@citypass/db';
import { upsertSlatePolicy } from '@citypass/db/logging';

export interface PolicyPerformance {
  policyName: string;
  impressions: number;
  clicks: number;
  saves: number;
  hides: number;
  ctr: number;
  saveRate: number;
  hideRate: number;
  rewardScore: number; // Composite reward (0-1)
}

/**
 * Analyze performance of each slate policy
 * @param lookbackHours - How far back to analyze (default: 24)
 */
export async function analyzePolicyPerformance(
  lookbackHours: number = 24
): Promise<PolicyPerformance[]> {
  try {
    const cutoffDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    console.log(`📊 [analyze-policies] Analyzing policy performance since ${cutoffDate.toISOString()}`);

    // Fetch slate impressions with policy metadata
    const slateImpressions = await prisma.eventLog.findMany({
      where: {
        eventType: 'SLATE_IMPRESSION',
        createdAt: {
          gte: cutoffDate,
        },
      },
      select: {
        traceId: true,
        payload: true,
      },
    });

    console.log(`📊 [analyze-policies] Found ${slateImpressions.length} slate impressions`);

    // Group by policy
    const policyStats = new Map<string, {
      impressions: number;
      clicks: number;
      saves: number;
      hides: number;
    }>();

    // Build trace -> policy mapping
    const tracePolicyMap = new Map<string, string>();

    for (const impression of slateImpressions) {
      const payload = impression.payload as any;
      const policyName = payload.slatePolicy?.name || 'unknown';

      tracePolicyMap.set(impression.traceId, policyName);

      if (!policyStats.has(policyName)) {
        policyStats.set(policyName, {
          impressions: 0,
          clicks: 0,
          saves: 0,
          hides: 0,
        });
      }

      policyStats.get(policyName)!.impressions += 1;
    }

    // Fetch interaction events (clicks, saves, hides)
    const interactions = await prisma.eventLog.findMany({
      where: {
        eventType: {
          in: ['CLICK_ROUTE', 'CLICK_BOOK', 'SAVE', 'HIDE'],
        },
        createdAt: {
          gte: cutoffDate,
        },
      },
      select: {
        traceId: true,
        eventType: true,
      },
    });

    // Attribute interactions to policies
    for (const interaction of interactions) {
      const policyName = tracePolicyMap.get(interaction.traceId);

      if (!policyName || !policyStats.has(policyName)) {
        continue;
      }

      const stats = policyStats.get(policyName)!;

      if (interaction.eventType === 'CLICK_ROUTE' || interaction.eventType === 'CLICK_BOOK') {
        stats.clicks += 1;
      } else if (interaction.eventType === 'SAVE') {
        stats.saves += 1;
      } else if (interaction.eventType === 'HIDE') {
        stats.hides += 1;
      }
    }

    // Compute performance metrics
    const performance: PolicyPerformance[] = [];

    for (const [policyName, stats] of policyStats.entries()) {
      const ctr = stats.impressions > 0 ? stats.clicks / stats.impressions : 0;
      const saveRate = stats.impressions > 0 ? stats.saves / stats.impressions : 0;
      const hideRate = stats.impressions > 0 ? stats.hides / stats.impressions : 0;

      // Composite reward: weighted combination of positive and negative signals
      const rewardScore = Math.max(0, Math.min(1,
        0.3 * ctr + 0.5 * saveRate - 0.3 * hideRate + 0.2
      ));

      performance.push({
        policyName,
        impressions: stats.impressions,
        clicks: stats.clicks,
        saves: stats.saves,
        hides: stats.hides,
        ctr,
        saveRate,
        hideRate,
        rewardScore,
      });
    }

    performance.sort((a, b) => b.rewardScore - a.rewardScore);

    console.log('📊 [analyze-policies] Policy performance:');
    for (const p of performance) {
      console.log(
        `  ${p.policyName}: reward=${p.rewardScore.toFixed(3)}, CTR=${p.ctr.toFixed(3)}, save=${p.saveRate.toFixed(3)}, hide=${p.hideRate.toFixed(3)}`
      );
    }

    return performance;
  } catch (error) {
    console.error('[analyze-policies] Analysis failed:', error);
    return [];
  }
}

/**
 * Update bandit parameters based on performance
 */
export async function updateBanditPolicies(lookbackHours: number = 24): Promise<void> {
  try {
    console.log('🎰 [update-bandit] Updating bandit policies...');

    const performance = await analyzePolicyPerformance(lookbackHours);

    if (performance.length === 0) {
      console.warn('[update-bandit] No performance data, skipping update');
      return;
    }

    // Find best performing policy
    const best = performance[0];

    console.log(`🏆 [update-bandit] Best policy: ${best.policyName} (reward: ${best.rewardScore.toFixed(3)})`);

    // Set best policy as active (if it has sufficient data)
    if (best.impressions >= 10) {
      await upsertSlatePolicy(
        best.policyName,
        {
          // Adjust policy params based on performance
          // For example, if save rate is high, increase exploration
          explorationBonus: best.saveRate > 0.05 ? 0.1 : 0.05,
          performance: {
            ctr: best.ctr,
            saveRate: best.saveRate,
            rewardScore: best.rewardScore,
            lastUpdated: new Date().toISOString(),
          },
        },
        true // Set as active
      );

      console.log(`✅ [update-bandit] Activated policy: ${best.policyName}`);
    } else {
      console.log('[update-bandit] Insufficient data for policy activation');
    }

    // Store performance metrics for all policies
    for (const p of performance) {
      if (p.policyName === best.policyName) continue; // Already updated

      await upsertSlatePolicy(
        p.policyName,
        {
          performance: {
            ctr: p.ctr,
            saveRate: p.saveRate,
            rewardScore: p.rewardScore,
            lastUpdated: new Date().toISOString(),
          },
        },
        false // Not active
      );
    }

    console.log('✅ [update-bandit] Bandit policies updated');
  } catch (error) {
    console.error('[update-bandit] Update failed:', error);
  }
}
