/**
 * /api/ingest-real - Ingest real events from URLs using OpenAI extraction
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractEventsFromUrl, extractEventsWithOpenAI } from '@citypass/utils';
import { prisma } from '@citypass/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const traceId = randomUUID();

  try {
    const body = await req.json();
    const { url, content, city = 'New York' } = body;

    if (!url && !content) {
      return NextResponse.json(
        { error: 'Either url or content is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 [${traceId}] Starting event extraction from ${url || 'content'}`);
    console.log(`🔑 [${traceId}] OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'SET' : 'MISSING'}`);
    console.log(`🔑 [${traceId}] Firecrawl API Key: ${process.env.FIRECRAWL_API_KEY ? 'SET' : 'MISSING'}`);

    // Extract events using OpenAI
    let result;
    if (url) {
      result = await extractEventsFromUrl(url, {
        city,
        openaiApiKey: process.env.OPENAI_API_KEY,
        firecrawlApiKey: process.env.FIRECRAWL_API_KEY,
      });
    } else {
      result = await extractEventsWithOpenAI(content, {
        city,
        sourceUrl: 'manual',
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    if (result.events.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No events found',
        extracted: 0,
        saved: 0,
        traceId,
      });
    }

    console.log(`✨ [${traceId}] Extracted ${result.events.length} events`);

    // Save events to database
    const savedEvents = [];
    const errors = [];

    for (const event of result.events) {
      try {
        // Generate unique hash from URL + start time
        const sourceUrl = url || 'manual-input';
        const urlHash = require('crypto')
          .createHash('sha256')
          .update(`${sourceUrl}:${event.title}:${event.startTime}`)
          .digest('hex')
          .slice(0, 32);

        const saved = await prisma.event.upsert({
          where: {
            unique_event: {
              canonicalUrlHash: urlHash,
              startTime: new Date(event.startTime),
            },
          },
          update: {
            title: event.title,
            description: event.description,
            venueName: event.venueName,
            address: event.address,
            neighborhood: event.neighborhood,
            priceMin: event.priceMin || null,
            priceMax: event.priceMax || null,
            category: event.category || 'OTHER',
            imageUrl: event.imageUrl,
            bookingUrl: event.bookingUrl,
            organizer: event.organizer,
          },
          create: {
            sourceUrl: sourceUrl,
            title: event.title,
            description: event.description || '',
            city: event.city,
            startTime: new Date(event.startTime),
            endTime: event.endTime ? new Date(event.endTime) : null,
            venueName: event.venueName,
            address: event.address,
            neighborhood: event.neighborhood,
            priceMin: event.priceMin || null,
            priceMax: event.priceMax || null,
            category: event.category || 'OTHER',
            imageUrl: event.imageUrl,
            bookingUrl: event.bookingUrl || sourceUrl,
            organizer: event.organizer,
            sourceDomain: new URL(sourceUrl).hostname,
            canonicalUrlHash: urlHash,
            checksum: require('crypto')
              .createHash('md5')
              .update(JSON.stringify(event))
              .digest('hex')
              .slice(0, 32),
          },
        });

        savedEvents.push(saved);
      } catch (eventError: any) {
        console.error(`Failed to save event "${event.title}":`, eventError.message);
        errors.push({
          title: event.title,
          error: eventError.message,
        });
      }
    }

    console.log(`💾 [${traceId}] Saved ${savedEvents.length}/${result.events.length} events`);

    return NextResponse.json({
      success: true,
      extracted: result.events.length,
      saved: savedEvents.length,
      errors: errors.length > 0 ? errors : undefined,
      events: savedEvents.map(e => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime,
        city: e.city,
      })),
      traceId,
      confidence: result.confidence,
    });
  } catch (error: any) {
    console.error(`[${traceId}] Ingestion error:`, error);
    return NextResponse.json(
      {
        error: error.message || 'Event ingestion failed',
        traceId,
      },
      { status: 500 }
    );
  }
}

/**
 * Get ingestion status/history
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const recentEvents = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        city: true,
        startTime: true,
        sourceDomain: true,
        createdAt: true,
      },
    });

    const stats = await prisma.event.aggregate({
      _count: true,
    });

    return NextResponse.json({
      recentEvents,
      totalEvents: stats._count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
