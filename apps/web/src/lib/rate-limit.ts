/**
 * Rate limiting utility for API routes
 * Simple in-memory implementation with LRU eviction
 *
 * In production, consider using Vercel KV or Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const limitMap = new Map<string, RateLimitEntry>();
const MAX_CACHE_SIZE = 10000;

export interface RateLimitConfig {
  /**
   * Unique identifier for this rate limit (e.g., IP address or session ID)
   */
  identifier: string;

  /**
   * Maximum number of requests allowed in the time window
   */
  limit: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;

  /**
   * Remaining requests in the current window
   */
  remaining: number;

  /**
   * Unix timestamp when the rate limit resets
   */
  resetAt: number;

  /**
   * Retry-After header value in seconds (only set when not allowed)
   */
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 *
 * @example
 * ```ts
 * const result = checkRateLimit({
 *   identifier: req.headers.get('x-forwarded-for') || 'unknown',
 *   limit: 100,
 *   windowSeconds: 60
 * });
 *
 * if (!result.allowed) {
 *   return NextResponse.json(
 *     { error: 'Rate limit exceeded' },
 *     {
 *       status: 429,
 *       headers: {
 *         'Retry-After': String(result.retryAfter),
 *         'X-RateLimit-Limit': String(100),
 *         'X-RateLimit-Remaining': String(result.remaining),
 *         'X-RateLimit-Reset': String(result.resetAt),
 *       }
 *     }
 *   );
 * }
 * ```
 */
export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const { identifier, limit, windowSeconds } = config;
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;

  const existing = limitMap.get(identifier);

  // If no entry or window expired, create new entry
  if (!existing || existing.resetAt < now) {
    limitMap.set(identifier, {
      count: 1,
      resetAt,
    });

    // LRU eviction if cache is too large
    if (limitMap.size > MAX_CACHE_SIZE) {
      const oldestKey = limitMap.keys().next().value;
      if (oldestKey) {
        limitMap.delete(oldestKey);
      }
    }

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  // Check if limit exceeded
  if (existing.count >= limit) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfter,
    };
  }

  // Increment count
  existing.count++;
  limitMap.set(identifier, existing);

  return {
    allowed: true,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Get rate limit identifier from Next.js request
 * Uses IP address from headers or falls back to a session identifier
 */
export function getRateLimitIdentifier(req: Request): string {
  // Try to get real IP from Vercel headers
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to user-agent hash (not ideal but better than nothing)
  const userAgent = req.headers.get('user-agent') || 'unknown';
  return `ua-${simpleHash(userAgent)}`;
}

/**
 * Simple string hash function for fallback identification
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
