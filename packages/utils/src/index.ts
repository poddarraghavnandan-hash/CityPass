import { createHash } from 'crypto';

/**
 * Creates a canonical hash from a URL for deduplication
 */
export function canonicalUrlHash(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove query params and fragments for canonicalization
    const canonical = `${parsed.protocol}//${parsed.host}${parsed.pathname}`.toLowerCase();
    return createHash('sha256').update(canonical).digest('hex');
  } catch {
    return createHash('sha256').update(url.toLowerCase()).digest('hex');
  }
}

/**
 * Creates content checksum for change detection
 */
export function contentChecksum(data: Record<string, any>): string {
  // Extract relevant fields for change detection
  const relevant = {
    title: data.title,
    description: data.description,
    start_time: data.start_time,
    end_time: data.end_time,
    venue_name: data.venue_name,
    price_min: data.price_min,
    price_max: data.price_max,
  };

  const normalized = JSON.stringify(relevant, Object.keys(relevant).sort());
  return createHash('md5').update(normalized).digest('hex');
}

/**
 * Normalizes venue name for deduplication
 */
export function canonicalVenueName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special chars
    .replace(/\s+/g, '-')    // Replace spaces with hyphens
    .replace(/^the-/, '')    // Remove leading "the"
    .trim();
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, i);
        console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Normalize category string to enum
 */
export function normalizeCategory(cat: string | undefined): string | undefined {
  if (!cat) return undefined;

  const normalized = cat.toLowerCase();
  const mapping: Record<string, string> = {
    'music': 'MUSIC',
    'concert': 'MUSIC',
    'show': 'MUSIC',
    'comedy': 'COMEDY',
    'standup': 'COMEDY',
    'theater': 'THEATRE',
    'theatre': 'THEATRE',
    'play': 'THEATRE',
    'fitness': 'FITNESS',
    'workout': 'FITNESS',
    'yoga': 'FITNESS',
    'dance': 'DANCE',
    'dancing': 'DANCE',
    'art': 'ARTS',
    'arts': 'ARTS',
    'gallery': 'ARTS',
    'food': 'FOOD',
    'dining': 'FOOD',
    'networking': 'NETWORKING',
    'meetup': 'NETWORKING',
    'family': 'FAMILY',
    'kids': 'FAMILY',
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  return 'OTHER';
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export * from './intention';
export * from './intent';
export * from './llm-intent';
export * from './event-extraction';
export * from './distance';
