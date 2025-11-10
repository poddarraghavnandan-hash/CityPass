/**
 * GET /api/social/oembed - Resolve social media oEmbed data
 * Fetches and sanitizes embed HTML from Instagram/TikTok
 * HTML is sanitized by @citypass/social using sanitize-html library
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getSocialOEmbed } from '@citypass/social';
import { OEmbedQuerySchema } from '@/lib/schemas';

export async function GET(req: NextRequest) {
  const traceId = randomUUID();
  const fetchedAt = new Date();

  try {
    const searchParams = req.nextUrl.searchParams;
    const query = OEmbedQuerySchema.parse({
      platform: searchParams.get('platform'),
      url: searchParams.get('url'),
    });

    // Note: getSocialOEmbed already sanitizes HTML using sanitize-html
    // and includes built-in LRU caching with TTL from env
    const result = await getSocialOEmbed(query.platform, query.url);

    // Determine if response was served from cache by comparing timestamps
    const wasFromCache = result.fetchedAt !== fetchedAt.toISOString();

    // Calculate cache expiration (default 1 hour if not rate-limited)
    const ttlSeconds = result.rateLimited
      ? 60 // 1 minute for rate-limited responses
      : Number(process.env.SOCIAL_OEMBED_CACHE_TTL || '3600');

    const expiresAt = new Date(
      new Date(result.fetchedAt).getTime() + ttlSeconds * 1000
    ).toISOString();

    // Return standardized contract per OEmbedOutputSchema
    return NextResponse.json({
      embedHtml: result.embedHtml || null,
      posterUrl: result.posterUrl || null,
      cached: wasFromCache,
      expiresAt,
      traceId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Validation failed',
          traceId,
          validationErrors: error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    console.error(`[${traceId}] social/oembed error:`, error);
    return NextResponse.json(
      {
        error: 'Failed to resolve embed',
        message: error instanceof Error ? error.message : 'Unknown error',
        traceId,
      },
      { status: 502 }
    );
  }
}
