"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestRequestSchema = exports.TypesenseEventSchema = exports.EventsSearchParamsSchema = exports.ApifyWebhookSchema = exports.FirecrawlWebhookSchema = exports.EventSchema = exports.EventCategorySchema = void 0;
const zod_1 = require("zod");
exports.EventCategorySchema = zod_1.z.enum([
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
exports.EventSchema = zod_1.z.object({
    source_url: zod_1.z.string().url(),
    title: zod_1.z.string().min(1),
    subtitle: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.enum([
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
    organizer: zod_1.z.string().optional(),
    venue_name: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    neighborhood: zod_1.z.string().optional(),
    city: zod_1.z.string(),
    lat: zod_1.z.number().optional(),
    lon: zod_1.z.number().optional(),
    start_time: zod_1.z.string().datetime(),
    end_time: zod_1.z.string().datetime().optional(),
    timezone: zod_1.z.string().optional(),
    price_min: zod_1.z.number().optional(),
    price_max: zod_1.z.number().optional(),
    currency: zod_1.z.string().optional(),
    min_age: zod_1.z.number().int().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional().default([]),
    image_url: zod_1.z.string().url().optional(),
    booking_url: zod_1.z.string().url().optional(),
    accessibility: zod_1.z.array(zod_1.z.string()).optional().default([]),
    source_domain: zod_1.z.string().optional(),
    checksum: zod_1.z.string().optional(),
    updated_at: zod_1.z.string().datetime().optional(),
});
exports.FirecrawlWebhookSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    data: zod_1.z.object({
        markdown: zod_1.z.string().optional(),
        html: zod_1.z.string().optional(),
        metadata: zod_1.z.object({
            title: zod_1.z.string().optional(),
            description: zod_1.z.string().optional(),
            url: zod_1.z.string(),
        }).passthrough(),
    }),
    jobId: zod_1.z.string().optional(),
});
exports.ApifyWebhookSchema = zod_1.z.object({
    eventType: zod_1.z.string(),
    eventData: zod_1.z.object({
        actorRunId: zod_1.z.string(),
    }).passthrough(),
    resource: zod_1.z.object({
        id: zod_1.z.string(),
        defaultDatasetId: zod_1.z.string().optional(),
    }).passthrough(),
});
exports.EventsSearchParamsSchema = zod_1.z.object({
    q: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    date_from: zod_1.z.string().optional(),
    date_to: zod_1.z.string().optional(),
    price_max: zod_1.z.number().optional(),
    neighborhood: zod_1.z.string().optional(),
    page: zod_1.z.number().int().positive().default(1),
    limit: zod_1.z.number().int().positive().max(100).default(20),
});
exports.TypesenseEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    subtitle: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    venue_name: zod_1.z.string().optional(),
    address: zod_1.z.string().optional(),
    neighborhood: zod_1.z.string().optional(),
    city: zod_1.z.string(),
    lat: zod_1.z.number().optional(),
    lon: zod_1.z.number().optional(),
    start_time: zod_1.z.number(),
    end_time: zod_1.z.number().optional(),
    price_min: zod_1.z.number().optional(),
    price_max: zod_1.z.number().optional(),
    tags: zod_1.z.array(zod_1.z.string()),
    image_url: zod_1.z.string().optional(),
    booking_url: zod_1.z.string().optional(),
    source_domain: zod_1.z.string(),
});
exports.IngestRequestSchema = zod_1.z.object({
    sourceId: zod_1.z.string().optional(),
    url: zod_1.z.string().url(),
    html: zod_1.z.string().optional(),
    markdown: zod_1.z.string().optional(),
    city: zod_1.z.string().default('New York'),
});
//# sourceMappingURL=index.js.map