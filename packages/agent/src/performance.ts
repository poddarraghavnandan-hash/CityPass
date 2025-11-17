/**
 * Performance Monitoring
 * Tracks latency and quality metrics for the agent pipeline
 */

export interface PerformanceMetrics {
  traceId: string;
  endpoint: string;
  totalMs: number;
  nodeTimings: Record<string, number>;
  p95Target: number;
  meetsTarget: boolean;
  quality?: {
    groundedness: number; // 0-1, are reasons backed by data?
    diversity: number; // 0-1, slate overlap
    coverage: number; // 0-1, % of intention tokens used
  };
}

const P95_TARGETS: Record<string, number> = {
  '/api/ask': 300,
  '/api/plan': 800,
  '/api/lens/recommend': 300,
};

const metrics: PerformanceMetrics[] = [];
const MAX_METRICS = 1000;

/**
 * Record a performance metric
 */
export function recordMetric(metric: PerformanceMetrics): void {
  metrics.push(metric);

  // Keep only last N metrics
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }

  // Log if target is not met
  if (!metric.meetsTarget) {
    console.warn(
      `⚠️ [${metric.traceId}] ${metric.endpoint} took ${metric.totalMs}ms (target: ${metric.p95Target}ms)`
    );
  }
}

/**
 * Get P95 latency for an endpoint
 */
export function getP95Latency(endpoint: string): number | null {
  const endpointMetrics = metrics.filter(m => m.endpoint === endpoint);

  if (endpointMetrics.length === 0) return null;

  const sorted = endpointMetrics
    .map(m => m.totalMs)
    .sort((a, b) => a - b);

  const p95Index = Math.floor(sorted.length * 0.95);

  return sorted[p95Index];
}

/**
 * Get performance summary for an endpoint
 */
export function getPerformanceSummary(endpoint: string): {
  count: number;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  target: number;
  meetingTarget: number; // % meeting target
} | null {
  const endpointMetrics = metrics.filter(m => m.endpoint === endpoint);

  if (endpointMetrics.length === 0) return null;

  const sorted = endpointMetrics
    .map(m => m.totalMs)
    .sort((a, b) => a - b);

  const p50Index = Math.floor(sorted.length * 0.5);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p99Index = Math.floor(sorted.length * 0.99);

  const meetingCount = endpointMetrics.filter(m => m.meetsTarget).length;
  const meetingTarget = (meetingCount / endpointMetrics.length) * 100;

  return {
    count: endpointMetrics.length,
    p50: sorted[p50Index],
    p95: sorted[p95Index],
    p99: sorted[p99Index],
    target: P95_TARGETS[endpoint] || 1000,
    meetingTarget,
  };
}

/**
 * Get quality metrics summary
 */
export function getQualitySummary(): {
  avgGroundedness: number;
  avgDiversity: number;
  avgCoverage: number;
  count: number;
} | null {
  const withQuality = metrics.filter(m => m.quality);

  if (withQuality.length === 0) return null;

  const avgGroundedness =
    withQuality.reduce((sum, m) => sum + (m.quality!.groundedness || 0), 0) /
    withQuality.length;

  const avgDiversity =
    withQuality.reduce((sum, m) => sum + (m.quality!.diversity || 0), 0) /
    withQuality.length;

  const avgCoverage =
    withQuality.reduce((sum, m) => sum + (m.quality!.coverage || 0), 0) /
    withQuality.length;

  return {
    avgGroundedness,
    avgDiversity,
    avgCoverage,
    count: withQuality.length,
  };
}

/**
 * Calculate groundedness: are reasons backed by actual event data?
 */
export function calculateGroundedness(
  reasons: string[],
  event: {
    priceMin?: number | null;
    distanceKm?: number | null;
    category?: string | null;
    venueName?: string | null;
  },
  socialProof?: {
    views: number;
    saves: number;
    friends: number;
  }
): number {
  if (reasons.length === 0) return 0;

  let grounded = 0;

  for (const reason of reasons) {
    const lower = reason.toLowerCase();

    // Check if reason is backed by data
    if (lower.includes('free') && event.priceMin === 0) grounded++;
    else if (lower.includes('$') && event.priceMin !== null && event.priceMin !== undefined)
      grounded++;
    else if (lower.includes('walk') || lower.includes('km')) grounded++;
    else if (lower.includes('friend') && socialProof && socialProof.friends > 0) grounded++;
    else if (lower.includes('saves') && socialProof && socialProof.saves > 0) grounded++;
    else if (lower.includes('views') && socialProof && socialProof.views > 0) grounded++;
    else if (lower.includes('at ') && event.venueName) grounded++;
    else if (lower.includes('matches') || lower.includes('fits')) grounded++;
  }

  return grounded / reasons.length;
}

/**
 * Export all metrics
 */
export function getAllMetrics(): PerformanceMetrics[] {
  return [...metrics];
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  metrics.length = 0;
}
