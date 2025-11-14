import { NextRequest, NextResponse } from 'next/server';
import { searchEvents } from '@/lib/typesense';
import { EventsSearchParamsSchema } from '@citypass/types';

type TypesenseHit<T = Record<string, unknown>> = {
  document: T;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const params = EventsSearchParamsSchema.parse({
      q: searchParams.get('q') || undefined,
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      price_max: searchParams.get('price_max') ? parseFloat(searchParams.get('price_max')!) : undefined,
      neighborhood: searchParams.get('neighborhood') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    });

    const results = await searchEvents({
      q: params.q,
      city: params.city,
      category: params.category,
      dateFrom: params.date_from ? new Date(params.date_from) : undefined,
      dateTo: params.date_to ? new Date(params.date_to) : undefined,
      priceMax: params.price_max,
      neighborhood: params.neighborhood,
      page: params.page,
      limit: params.limit,
    });

    const events =
      results.hits?.map((hit: TypesenseHit) => hit.document) || [];

    return NextResponse.json({
      events,
      found: results.found,
      page: results.page,
    });
  } catch (error: any) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
