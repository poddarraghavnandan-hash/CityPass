import { z } from 'zod';
export declare const EventCategorySchema: z.ZodEnum<{
    MUSIC: "MUSIC";
    COMEDY: "COMEDY";
    THEATRE: "THEATRE";
    FITNESS: "FITNESS";
    DANCE: "DANCE";
    ARTS: "ARTS";
    FOOD: "FOOD";
    NETWORKING: "NETWORKING";
    FAMILY: "FAMILY";
    OTHER: "OTHER";
}>;
export type EventCategory = z.infer<typeof EventCategorySchema>;
export declare const EventSchema: z.ZodObject<{
    source_url: z.ZodString;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodEnum<{
        music: "music";
        comedy: "comedy";
        theatre: "theatre";
        fitness: "fitness";
        dance: "dance";
        arts: "arts";
        food: "food";
        networking: "networking";
        family: "family";
        other: "other";
    }>>;
    organizer: z.ZodOptional<z.ZodString>;
    venue_name: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    neighborhood: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    lat: z.ZodOptional<z.ZodNumber>;
    lon: z.ZodOptional<z.ZodNumber>;
    start_time: z.ZodString;
    end_time: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    price_min: z.ZodOptional<z.ZodNumber>;
    price_max: z.ZodOptional<z.ZodNumber>;
    currency: z.ZodOptional<z.ZodString>;
    min_age: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    image_url: z.ZodOptional<z.ZodString>;
    booking_url: z.ZodOptional<z.ZodString>;
    accessibility: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString>>>;
    source_domain: z.ZodOptional<z.ZodString>;
    checksum: z.ZodOptional<z.ZodString>;
    updated_at: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type EventData = z.infer<typeof EventSchema>;
export declare const FirecrawlWebhookSchema: z.ZodObject<{
    success: z.ZodBoolean;
    data: z.ZodObject<{
        markdown: z.ZodOptional<z.ZodString>;
        html: z.ZodOptional<z.ZodString>;
        metadata: z.ZodObject<{
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            url: z.ZodString;
        }, z.core.$loose>;
    }, z.core.$strip>;
    jobId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type FirecrawlWebhook = z.infer<typeof FirecrawlWebhookSchema>;
export declare const ApifyWebhookSchema: z.ZodObject<{
    eventType: z.ZodString;
    eventData: z.ZodObject<{
        actorRunId: z.ZodString;
    }, z.core.$loose>;
    resource: z.ZodObject<{
        id: z.ZodString;
        defaultDatasetId: z.ZodOptional<z.ZodString>;
    }, z.core.$loose>;
}, z.core.$strip>;
export type ApifyWebhook = z.infer<typeof ApifyWebhookSchema>;
export declare const EventsSearchParamsSchema: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    date_from: z.ZodOptional<z.ZodString>;
    date_to: z.ZodOptional<z.ZodString>;
    price_max: z.ZodOptional<z.ZodNumber>;
    neighborhood: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type EventsSearchParams = z.infer<typeof EventsSearchParamsSchema>;
export declare const TypesenseEventSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    venue_name: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodString>;
    neighborhood: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    lat: z.ZodOptional<z.ZodNumber>;
    lon: z.ZodOptional<z.ZodNumber>;
    start_time: z.ZodNumber;
    end_time: z.ZodOptional<z.ZodNumber>;
    price_min: z.ZodOptional<z.ZodNumber>;
    price_max: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodArray<z.ZodString>;
    image_url: z.ZodOptional<z.ZodString>;
    booking_url: z.ZodOptional<z.ZodString>;
    source_domain: z.ZodString;
}, z.core.$strip>;
export type TypesenseEvent = z.infer<typeof TypesenseEventSchema>;
export interface CrawlState {
    sourceId: string;
    sourceUrl: string;
    sourceDomain: string;
    city: string;
    crawlMethod: 'FIRECRAWL' | 'APIFY';
    urls: string[];
    processedUrls: string[];
    rawPages: Array<{
        url: string;
        html: string;
        markdown?: string;
    }>;
    extractedEvents: EventData[];
    errors: string[];
    shouldRetry: boolean;
    shouldSwitchMethod: boolean;
}
export declare const IngestRequestSchema: z.ZodObject<{
    sourceId: z.ZodOptional<z.ZodString>;
    url: z.ZodString;
    html: z.ZodOptional<z.ZodString>;
    markdown: z.ZodOptional<z.ZodString>;
    city: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type IngestRequest = z.infer<typeof IngestRequestSchema>;
//# sourceMappingURL=index.d.ts.map