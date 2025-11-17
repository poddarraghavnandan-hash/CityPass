import { NextRequest, NextResponse } from 'next/server';
import { searchEvents } from '@/lib/typesense';
import { searchEventsInDatabase } from '@citypass/db';
import { EventsSearchParamsSchema } from '@citypass/types';
import type {
  TypesenseEventDocument,
  TypesenseSearchHit,
} from '@citypass/search';

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

    // Try Typesense first, fallback to database search
    let events: any[] = [];
    let found = 0;
    let searchMethod = 'typesense';

    try {
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

      const hits: TypesenseSearchHit<TypesenseEventDocument>[] = results.hits ?? [];
      events = hits.map((hit) => hit.document);
      found = results.found;
    } catch (typesenseError) {
      // Fallback to database search
      console.warn('Typesense unavailable, using database search:', typesenseError);
      searchMethod = 'database';

      const dbResults = await searchEventsInDatabase({
        q: params.q,
        city: params.city,
        category: params.category as any,
        dateFrom: params.date_from ? new Date(params.date_from) : undefined,
        dateTo: params.date_to ? new Date(params.date_to) : undefined,
        priceMax: params.price_max,
        limit: params.limit,
        offset: (params.page - 1) * params.limit,
      });

      events = dbResults.events;
      found = dbResults.total;
    }

    return NextResponse.json({
      events,
      found,
      page: params.page,
      searchMethod, // Indicate which search method was used
    });
  } catch (error: any) {
    console.error('Events API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
