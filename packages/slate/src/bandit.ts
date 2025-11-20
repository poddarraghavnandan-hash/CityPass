/**
 * Multi-Armed Bandit for Slate Policy Selection
 * Implements epsilon-greedy and Thompson Sampling strategies
 */

import { getCurrentSlatePolicy, upsertSlatePolicy } from '@citypass/db/logging';
import type { SlatePolicy } from './index';
import { DEFAULT_POLICY, EXPLORATION_POLICY } from './index';

// ============================================
// Types
// ============================================

export interface BanditStats {
  policyName: string;
  trials: number; // Number of times policy was selected
  successes: number; // Number of positive outcomes (clicks, saves, etc.)
  totalReward: number; // Sum of rewards
  averageReward: number; // Mean reward
  lastUsed: Date;
}

export interface BanditContext {
  userId?: string;
  sessionId: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number; // 0-6
  isNewUser: boolean;
}

// ============================================
// In-Memory Bandit State
// ============================================

/**
 * In-memory bandit statistics (should be persisted to KV or DB in production)
 */
class BanditMemory {
  private stats: Map<string, BanditStats>;

  constructor() {
    this.stats = new Map();
  }

  getStats(policyName: string): BanditStats {
    if (!this.stats.has(policyName)) {
      this.stats.set(policyName, {
        policyName,
        trials: 0,
        successes: 0,
        totalReward: 0,
        averageReward: 0,
        lastUsed: new Date(),
      });
    }

    return this.stats.get(policyName)!;
  }

  updateStats(policyName: string, reward: number): void {
    const stats = this.getStats(policyName);
    stats.trials += 1;
    stats.successes += reward > 0.5 ? 1 : 0; // Binary success threshold
    stats.totalReward += reward;
    stats.averageReward = stats.totalReward / stats.trials;
    stats.lastUsed = new Date();

    console.log(
      `📊 [Bandit] Updated ${policyName}: trials=${stats.trials}, avg_reward=${stats.averageReward.toFixed(3)}`
    );
  }

  getAllStats(): BanditStats[] {
    return Array.from(this.stats.values());
  }

  reset(): void {
    this.stats.clear();
  }
}

// Global bandit memory
const banditMemory = new BanditMemory();

// ============================================
// Bandit Algorithms
// ============================================

/**
 * Epsilon-Greedy Bandit
 * With probability ε, explore random policy
 * With probability 1-ε, exploit best policy
 *
 * PHASE 2 (WEEK 3-4): Increased epsilon from 0.15 → 0.25 for more exploration
 */
export function epsilonGreedySelect(
  policies: SlatePolicy[],
  epsilon: number = 0.25,
  context?: BanditContext
): { policy: SlatePolicy; policyName: string; wasExploration: boolean } {
  if (policies.length === 0) {
    throw new Error('No policies available');
  }

  // Exploration: select random policy
  if (Math.random() < epsilon) {
    const randomIndex = Math.floor(Math.random() * policies.length);
    const policy = policies[randomIndex];

    console.log(`🎲 [Bandit] Exploring with policy: ${policy.name}`);

    return {
      policy,
      policyName: policy.name,
      wasExploration: true,
    };
  }

  // Exploitation: select best policy by average reward
  const statsArray = policies.map(p => ({
    policy: p,
    stats: banditMemory.getStats(p.name),
  }));

  statsArray.sort((a, b) => b.stats.averageReward - a.stats.averageReward);

  const best = statsArray[0];

  console.log(`🎯 [Bandit] Exploiting best policy: ${best.policy.name} (avg reward: ${best.stats.averageReward.toFixed(3)})`);

  return {
    policy: best.policy,
    policyName: best.policy.name,
    wasExploration: false,
  };
}

/**
 * Thompson Sampling Bandit
 * Uses Beta distribution to model reward probability
 */
export function thompsonSamplingSelect(
  policies: SlatePolicy[],
  context?: BanditContext
): { policy: SlatePolicy; policyName: string; wasExploration: boolean } {
  if (policies.length === 0) {
    throw new Error('No policies available');
  }

  // Sample from Beta distribution for each policy
  const samples = policies.map(policy => {
    const stats = banditMemory.getStats(policy.name);

    // Beta(α, β) where α = successes + 1, β = failures + 1
    const alpha = stats.successes + 1;
    const beta = stats.trials - stats.successes + 1;

    const sample = sampleBeta(alpha, beta);

    return { policy, sample };
  });

  // Select policy with highest sample
  samples.sort((a, b) => b.sample - a.sample);
  const selected = samples[0];

  console.log(`🎲 [Bandit] Thompson sampling selected: ${selected.policy.name} (sample: ${selected.sample.toFixed(3)})`);

  return {
    policy: selected.policy,
    policyName: selected.policy.name,
    wasExploration: false, // Thompson sampling always explores inherently
  };
}

/**
 * Choose policy for user based on context
 * Uses epsilon-greedy by default
 */
export async function choosePolicyForUser(
  userId: string | undefined,
  context: Partial<BanditContext>
): Promise<{
  policy: SlatePolicy;
  policyName: string;
  wasExploration: boolean;
}> {
  // Try to load active policy from DB
  const activePolicy = await getCurrentSlatePolicy();

  // Available policies
  const policies = [DEFAULT_POLICY, EXPLORATION_POLICY];

  // If active policy exists in DB and matches a known policy, use it directly
  if (activePolicy && policies.some(p => p.name === activePolicy.name)) {
    const policy = policies.find(p => p.name === activePolicy.name)!;

    // Merge params from DB if available
    const mergedPolicy: SlatePolicy = {
      ...policy,
      ...activePolicy.params,
    };

    console.log(`✅ [Bandit] Using active policy from DB: ${activePolicy.name}`);

    return {
      policy: mergedPolicy,
      policyName: activePolicy.name,
      wasExploration: false,
    };
  }

  // Otherwise, use epsilon-greedy selection
  const fullContext: BanditContext = {
    userId,
    sessionId: context.sessionId || 'default',
    timeOfDay: context.timeOfDay || getTimeOfDay(),
    dayOfWeek: context.dayOfWeek ?? new Date().getDay(),
    isNewUser: context.isNewUser ?? !userId,
  };

  // PHASE 2 (WEEK 3-4): Increased exploration rate to 25% for all users
  // Research shows event discovery benefits from higher exploration (TikTok uses 30-50%)
  const epsilon = 0.25;

  return epsilonGreedySelect(policies, epsilon, fullContext);
}

/**
 * Record outcome of a policy selection
 * @param policyName - Name of the policy that was used
 * @param reward - Reward value (0-1), e.g., 1 for click, 0.5 for view, 0 for skip
 */
export function recordPolicyOutcome(policyName: string, reward: number): void {
  // Clamp reward to [0, 1]
  const clampedReward = Math.max(0, Math.min(1, reward));

  banditMemory.updateStats(policyName, clampedReward);
}

/**
 * Get current bandit statistics for all policies
 */
export function getBanditStats(): BanditStats[] {
  return banditMemory.getAllStats();
}

/**
 * Reset bandit statistics (for testing or retraining)
 */
export function resetBanditStats(): void {
  banditMemory.reset();
  console.log('🔄 [Bandit] Statistics reset');
}

// ============================================
// Helper Functions
// ============================================

/**
 * Sample from Beta distribution using rejection sampling
 * Simplified implementation for Thompson Sampling
 */
function sampleBeta(alpha: number, beta: number): number {
  // Use simple approximation: mean of Beta(α, β) = α / (α + β)
  // For more accurate sampling, use a proper Beta distribution library
  const mean = alpha / (alpha + beta);

  // Add some random noise around the mean
  const noise = (Math.random() - 0.5) * 0.2;

  return Math.max(0, Math.min(1, mean + noise));
}

/**
 * Get current time of day
 */
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ============================================
// Exports
// ============================================

export { banditMemory };
