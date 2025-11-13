import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { prisma } from '@citypass/db';
import { plan } from '@citypass/agent';
import { IntentionTokensSchema, type RankedItem } from '@citypass/types';
import { diversifyByGraph } from '@citypass/cag';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

const BodySchema = z.object({
  intention: z
    .object({
      user: z
        .object({
          id: z.string(),
          city: z.string().optional(),
        })
        .optional(),
      tokens: IntentionTokensSchema.partial().optional(),
      freeText: z.string().optional(),
    })
    .optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(6).max(30).default(15),
  ids: z.array(z.string()).min(1).optional(),
  graphDiversification: z.boolean().optional().default(false),
  ingestionRequest: z
    .object({
      city: z.string().min(2).optional(),
      reason: z.string().max(280).optional(),
      priority: z.number().int().min(0).max(5).optional(),
      requestedBy: z.string().max(120).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  const traceId = randomUUID();

  // Rate limiting: 200 requests per minute per IP (higher limit for recommendations)
  const rateLimitId = getRateLimitIdentifier(req);
  const rateLimit = checkRateLimit({
    identifier: rateLimitId,
    limit: 200,
    windowSeconds: 60,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        traceId,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.retryAfter),
          'X-RateLimit-Limit': '200',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimit.resetAt),
        },
      }
    );
  }

  try {
    const payload = await req.json();
    const body = BodySchema.parse(payload);

    if (body.ingestionRequest) {
      const fallbackCity =
        body.ingestionRequest.city ||
        body.intention?.tokens?.city ||
        body.intention?.user?.city ||
        process.env.NEXT_PUBLIC_DEFAULT_CITY ||
        'New York';

      const request = await prisma.ingestionRequest.create({
        data: {
          city: fallbackCity,
          tokens: body.intention?.tokens ?? {},
          reason: body.ingestionRequest.reason,
          priority: body.ingestionRequest.priority ?? 0,
          requestedBy: body.ingestionRequest.requestedBy ?? body.intention?.user?.id,
          requesterIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
          requesterAgent: req.headers.get('user-agent') || undefined,
        },
      });

      return NextResponse.json(
        {
          queued: true,
          request,
        },
        { status: 202 }
      );
    }

    const limit = body.limit;
    const page = body.page;
    const offset = (page - 1) * limit;

    const agentResult = await plan({
      user: body.intention?.user,
      tokens: body.intention?.tokens,
      freeText: body.intention?.freeText,
    });

    const slates = agentResult.state.slates || {
      best: [],
      wildcard: [],
      closeAndEasy: [],
    };

    const combined: RankedItem[] = [
      ...(slates.best || []),
      ...(slates.wildcard || []),
      ...(slates.closeAndEasy || []),
    ];

    if (combined.length === 0) {
      return NextResponse.json({
        items: [],
        intention: agentResult.state.intention,
        page,
        hasMore: false,
        traceId: agentResult.state.traceId,
      });
    }

    // Deduplicate by event id preserving order
    const uniqueMap = new Map<string, RankedItem>();
    combined.forEach(item => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    let orderedItems = Array.from(uniqueMap.values());

    // If IDs were requested (e.g., deterministic tests), filter to that set
    if (body.ids) {
      orderedItems = body.ids
        .map(id => uniqueMap.get(id))
        .filter((item): item is RankedItem => Boolean(item));
    }

    // Optional graph diversification pass using user id
    if (body.graphDiversification && body.intention?.user?.id) {
      const diversifiedIds = await diversifyByGraph(
        orderedItems.map(item => item.id),
        body.intention.user.id,
        0.6,
        Math.min(orderedItems.length, limit * 3)
      );

      const idToItem = new Map(orderedItems.map(item => [item.id, item]));
      orderedItems = diversifiedIds
        .map(id => idToItem.get(id))
        .filter((item): item is RankedItem => Boolean(item));
    }

    const pageItems = orderedItems.slice(offset, offset + limit);

    return NextResponse.json({
      items: pageItems,
      slates,
      page,
      hasMore: orderedItems.length > offset + pageItems.length,
      intention: agentResult.state.intention,
      traceId: agentResult.state.traceId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.flatten() }, { status: 400 });
    }

    console.error('lens/recommend error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const requestId = searchParams.get('requestId');
  const city = searchParams.get('city');

  if (!requestId && !city) {
    return NextResponse.json(
      { error: 'Provide requestId or city query param to inspect ingestion status' },
      { status: 400 }
    );
  }

  const request = await prisma.ingestionRequest.findFirst({
    where: requestId ? { id: requestId } : { city: city ?? '' },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ request });
}
