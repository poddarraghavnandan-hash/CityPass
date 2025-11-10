// @ts-expect-error - Missing type definitions for sanitize-html
import sanitizeHtml from 'sanitize-html';
import type { SocialPlatform } from '@citypass/types';

interface CacheEntry {
  value: SocialOEmbedResult;
  expiresAt: number;
}

const MAX_CACHE_SIZE = 400;
const cache = new Map<string, CacheEntry>();

const PLATFORM_ENDPOINTS: Record<SocialPlatform, string | undefined> = {
  instagram: process.env.SOCIAL_INSTAGRAM_OEMBED_URL,
  tiktok: process.env.SOCIAL_TIKTOK_OEMBED_URL,
};

export interface SocialOEmbedResult {
  platform: SocialPlatform;
  url: string;
  embedHtml?: string;
  posterUrl?: string;
  authorName?: string;
  authorHandle?: string;
  caption?: string;
  attributionUrl?: string;
  fetchedAt: string;
  rateLimited?: boolean;
}

function sanitizeEmbed(html: string, platform: SocialPlatform): string {
  return sanitizeHtml(html, {
    allowedTags: ['iframe', 'blockquote', 'section', 'a', 'span', 'div', 'img', 'strong', 'em', 'p'],
    allowedAttributes: {
      iframe: ['src', 'title', 'frameborder', 'allow', 'allowfullscreen', 'scrolling', 'loading'],
      blockquote: ['cite', 'data-instgrm-permalink', 'class'],
      a: ['href', 'rel', 'target', 'title'],
      div: ['class', 'style', 'id', 'data-video-id'],
      img: ['src', 'alt', 'loading'],
    },
    allowedSchemes: ['https'],
    transformTags: {
      iframe: (_tagName: any, attribs: any) => ({
        tagName: 'iframe',
        attribs: {
          ...attribs,
          loading: attribs.loading || 'lazy',
          title: attribs.title || `${platform} embed`,
        },
      }),
    },
  });
}

function getTtlSeconds(): number {
  const raw = Number(process.env.SOCIAL_OEMBED_CACHE_TTL || '3600');
  return Number.isFinite(raw) && raw > 0 ? raw : 3600;
}

function getCacheKey(platform: SocialPlatform, url: string): string {
  return `${platform}:${url}`;
}

function setCache(key: string, value: SocialOEmbedResult) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
  cache.set(key, {
    value,
    expiresAt: Date.now() + getTtlSeconds() * 1000,
  });
}

function getFromCache(key: string): SocialOEmbedResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  // Refresh order for LRU behaviour
  cache.delete(key);
  cache.set(key, entry);
  return entry.value;
}

async function requestOEmbed(platform: SocialPlatform, targetUrl: string): Promise<Response> {
  const endpoint = PLATFORM_ENDPOINTS[platform];
  if (!endpoint) {
    throw new Error(`Missing ${platform} oEmbed endpoint environment variable`);
  }

  const requestUrl = new URL(endpoint);
  requestUrl.searchParams.set('url', targetUrl);
  requestUrl.searchParams.set('omitscript', 'true');
  requestUrl.searchParams.set('hidecaption', 'true');

  return fetch(requestUrl.toString(), {
    headers: {
      'User-Agent': 'CityPass/CityLens (+https://citypass.ai)',
      Accept: 'application/json',
    },
  });
}

export async function getSocialOEmbed(
  platform: SocialPlatform,
  targetUrl: string
): Promise<SocialOEmbedResult> {
  const cacheKey = getCacheKey(platform, targetUrl);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  let response: Response | null = null;
  try {
    response = await requestOEmbed(platform, targetUrl);
  } catch {
    const fallback = fallbackResult(platform, targetUrl);
    setCache(cacheKey, fallback);
    return fallback;
  }

  const payload = await response.json().catch(() => ({}));
  const base: SocialOEmbedResult = {
    platform,
    url: targetUrl,
    posterUrl: payload?.thumbnail_url,
    authorName: payload?.author_name,
    authorHandle: payload?.author_url,
    caption: payload?.title,
    attributionUrl: payload?.author_url || payload?.provider_url,
    fetchedAt: new Date().toISOString(),
  };

  if (!response.ok || !payload?.html) {
    const degraded = {
      ...base,
      rateLimited: response.status === 429,
      embedHtml: undefined,
    };
    setCache(cacheKey, degraded);
    return degraded;
  }

  const sanitized = sanitizeEmbed(payload.html, platform);
  const result = {
    ...base,
    embedHtml: wrapEmbed(sanitized, platform),
  };
  setCache(cacheKey, result);
  return result;
}

function fallbackResult(platform: SocialPlatform, url: string): SocialOEmbedResult {
  return {
    platform,
    url,
    fetchedAt: new Date().toISOString(),
  };
}

function wrapEmbed(html: string, platform: SocialPlatform): string {
  return `<div class="citylens-embed citylens-embed-${platform}">${html}</div>`;
}
