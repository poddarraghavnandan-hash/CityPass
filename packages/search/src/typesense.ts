import Typesense from 'typesense';

export const EVENTS_COLLECTION = 'events';

export const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
      protocol: (process.env.TYPESENSE_PROTOCOL as 'http' | 'https') || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz',
  connectionTimeoutSeconds: 5,
});

export async function ensureEventsCollection() {
  const schema = {
    name: EVENTS_COLLECTION,
    fields: [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'subtitle', type: 'string', optional: true },
      { name: 'description', type: 'string', optional: true },
      { name: 'category', type: 'string', optional: true, facet: true },
      { name: 'venue_name', type: 'string', optional: true, facet: true },
      { name: 'address', type: 'string', optional: true },
      { name: 'neighborhood', type: 'string', optional: true, facet: true },
      { name: 'city', type: 'string', facet: true },
      { name: 'lat', type: 'float', optional: true },
      { name: 'lon', type: 'float', optional: true },
      { name: 'start_time', type: 'int64' },
      { name: 'end_time', type: 'int64', optional: true },
      { name: 'price_min', type: 'float', optional: true },
      { name: 'price_max', type: 'float', optional: true },
      { name: 'tags', type: 'string[]', optional: true },
      { name: 'image_url', type: 'string', optional: true },
      { name: 'booking_url', type: 'string', optional: true },
      { name: 'source_domain', type: 'string', facet: true },
    ],
  };

  try {
    await typesenseClient.collections(EVENTS_COLLECTION).retrieve();
    console.log('✅ Events collection exists');
  } catch (error: any) {
    if (error?.httpStatus === 404) {
      console.log('📦 Creating events collection...');
      // @ts-ignore - Typesense API typing issue
      await typesenseClient.collections().create(schema);
      console.log('✅ Events collection created');
    } else {
      throw error;
    }
  }
}

export async function indexEvent(event: any) {
  const document = {
    id: event.id,
    title: event.title,
    subtitle: event.subtitle || '',
    description: event.description || '',
    category: event.category || '',
    venue_name: event.venueName || '',
    address: event.address || '',
    neighborhood: event.neighborhood || '',
    city: event.city,
    lat: event.lat,
    lon: event.lon,
    start_time: Math.floor(new Date(event.startTime).getTime() / 1000),
    end_time: event.endTime ? Math.floor(new Date(event.endTime).getTime() / 1000) : undefined,
    price_min: event.priceMin,
    price_max: event.priceMax,
    tags: event.tags || [],
    image_url: event.imageUrl || '',
    booking_url: event.bookingUrl || '',
    source_domain: event.sourceDomain,
  };

  await typesenseClient.collections(EVENTS_COLLECTION).documents().upsert(document);
}

interface SearchParams {
  q?: string;
  city?: string;
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  priceMax?: number;
  neighborhood?: string;
  page?: number;
  limit?: number;
}

export async function searchEvents(params: SearchParams) {
  const {
    q = '*',
    city,
    category,
    dateFrom,
    dateTo,
    priceMax,
    neighborhood,
    page = 1,
    limit = 20,
  } = params;

  const filterBy: string[] = [];

  if (city) filterBy.push(`city:=${city}`);
  if (category) filterBy.push(`category:=${category}`);
  if (neighborhood) filterBy.push(`neighborhood:=${neighborhood}`);

  if (dateFrom) {
    const timestamp = Math.floor(dateFrom.getTime() / 1000);
    filterBy.push(`start_time:>=${timestamp}`);
  }

  if (dateTo) {
    const timestamp = Math.floor(dateTo.getTime() / 1000);
    filterBy.push(`start_time:<=${timestamp}`);
  }

  if (priceMax !== undefined) {
    filterBy.push(`price_min:<=${priceMax}`);
  }

  const searchParams = {
    q,
    query_by: 'title,description,venue_name,neighborhood',
    filter_by: filterBy.length > 0 ? filterBy.join(' && ') : undefined,
    sort_by: 'start_time:asc',
    page,
    per_page: limit,
  };

  const results = await typesenseClient
    .collections(EVENTS_COLLECTION)
    .documents()
    .search(searchParams);

  return results;
}
