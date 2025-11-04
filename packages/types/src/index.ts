import { z } from 'zod';

// Event category enum matching Prisma
export const EventCategorySchema = z.enum([
  'MUSIC',
  'COMEDY',
  'THEATRE',
  'FITNESS',
  'DANCE',
  'ARTS',
  'FOOD',
  'NETWORKING',
  'FAMILY',
  'OTHER',
]);

export type EventCategory = z.infer<typeof EventCategorySchema>;

// Event JSON schema from spec
export const EventSchema = z.object({
  source_url: z.string().url(),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  category: z.enum([
    'music',
    'comedy',
    'theatre',
    'fitness',
    'dance',
    'arts',
    'food',
    'networking',
    'family',
    'other',
  ]).optional(),
  organizer: z.string().optional(),
  venue_name: z.string().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  start_time: z.string().datetime(), // ISO 8601
  end_time: z.string().datetime().optional(),
  timezone: z.string().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  currency: z.string().optional(),
  min_age: z.number().int().optional(),
  tags: z.array(z.string()).optional().default([]),
  image_url: z.string().url().optional(),
  booking_url: z.string().url().optional(),
  accessibility: z.array(z.string()).optional().default([]),
  source_domain: z.string().optional(),
  checksum: z.string().optional(),
  updated_at: z.string().datetime().optional(),
});

export type EventData = z.infer<typeof EventSchema>;

// Webhook payloads
export const FirecrawlWebhookSchema = z.object({
  success: z.boolean(),
  data: z.object({
    markdown: z.string().optional(),
    html: z.string().optional(),
    metadata: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      url: z.string(),
    }).passthrough(),
  }),
  jobId: z.string().optional(),
});

export type FirecrawlWebhook = z.infer<typeof FirecrawlWebhookSchema>;

export const ApifyWebhookSchema = z.object({
  eventType: z.string(),
  eventData: z.object({
    actorRunId: z.string(),
  }).passthrough(),
  resource: z.object({
    id: z.string(),
    defaultDatasetId: z.string().optional(),
  }).passthrough(),
});

export type ApifyWebhook = z.infer<typeof ApifyWebhookSchema>;

// API responses
export const EventsSearchParamsSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  price_max: z.number().optional(),
  neighborhood: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type EventsSearchParams = z.infer<typeof EventsSearchParamsSchema>;

export const TypesenseEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  venue_name: z.string().optional(),
  address: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  start_time: z.number(), // Unix timestamp
  end_time: z.number().optional(),
  price_min: z.number().optional(),
  price_max: z.number().optional(),
  tags: z.array(z.string()),
  image_url: z.string().optional(),
  booking_url: z.string().optional(),
  source_domain: z.string(),
});

export type TypesenseEvent = z.infer<typeof TypesenseEventSchema>;

// LangGraph state
export interface CrawlState {
  sourceId: string;
  sourceUrl: string;
  sourceDomain: string;
  city: string;
  crawlMethod: 'FIRECRAWL' | 'APIFY';

  // Discovered URLs
  urls: string[];
  processedUrls: string[];

  // Scraped content
  rawPages: Array<{
    url: string;
    html: string;
    markdown?: string;
  }>;

  // Extracted events
  extractedEvents: EventData[];

  // Errors
  errors: string[];

  // Decision flags
  shouldRetry: boolean;
  shouldSwitchMethod: boolean;
}

export const IngestRequestSchema = z.object({
  sourceId: z.string().optional(),
  url: z.string().url(),
  html: z.string().optional(),
  markdown: z.string().optional(),
  city: z.string().default('New York'),
});

export type IngestRequest = z.infer<typeof IngestRequestSchema>;
