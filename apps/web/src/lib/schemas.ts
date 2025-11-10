/**
 * Zod validation schemas for API routes
 * Enforces input contracts and prevents injection attacks
 */

import { z } from 'zod';
import {
  IntentionSchema,
  SocialPlatformSchema,
  IntentionTokensSchema,
} from '@citypass/types';

// ============================================================================
// POST /api/ask - Natural language intention understanding
// ============================================================================

export const AskInputSchema = z.object({
  freeText: z
    .string()
    .min(1, 'Free text is required')
    .max(10000, 'Free text must be less than 10,000 characters')
    .trim(),
  context: z.any().optional(), // Allow any context object
});

export type AskInput = z.infer<typeof AskInputSchema>;

export const AskOutputSchema = z.object({
  tokens: IntentionTokensSchema,
  intention: IntentionSchema,
  traceId: z.string().uuid(),
});

export type AskOutput = z.infer<typeof AskOutputSchema>;

// ============================================================================
// POST /api/plan - Agent-based planning with 3 slates
// ============================================================================

export const PlanInputSchema = z.object({
  intention: IntentionSchema,
});

export type PlanInput = z.infer<typeof PlanInputSchema>;

export const SlateSchema = z.object({
  type: z.enum(['best', 'wildcard', 'close']),
  title: z.string(),
  description: z.string(),
  events: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      startTime: z.string().datetime(),
      venueName: z.string().nullable().optional(),
      priceMin: z.number().nullable().optional(),
      distanceKm: z.number().nullable().optional(),
      fitScore: z.number(),
    })
  ),
  eta: z.string().optional(), // Human-readable ETA like "30 min"
});

export const PlanOutputSchema = z.object({
  slates: z.array(SlateSchema).length(3), // Exactly 3 slates
  reasons: z.array(z.string()), // Explanation of recommendations
  intention: IntentionSchema,
  traceId: z.string().uuid(),
  logs: z.array(z.string()).optional(), // Debug logs
});

export type PlanOutput = z.infer<typeof PlanOutputSchema>;

// ============================================================================
// GET /api/plan/ics?eventId=x - ICS calendar export
// ============================================================================

export const IcsQuerySchema = z.object({
  eventId: z.string().uuid('Event ID must be a valid UUID'),
});

export type IcsQuery = z.infer<typeof IcsQuerySchema>;

// ============================================================================
// POST /api/lens/recommend - Hybrid search with pagination
// ============================================================================

export const RecommendInputSchema = z.object({
  intention: IntentionSchema,
  page: z
    .number()
    .int('Page must be an integer')
    .min(0, 'Page must be non-negative')
    .default(0)
    .optional(),
  pageSize: z
    .number()
    .int('Page size must be an integer')
    .min(1, 'Page size must be at least 1')
    .max(100, 'Page size cannot exceed 100')
    .default(20)
    .optional(),
  graphDiversification: z
    .boolean()
    .default(false)
    .optional(),
});

export type RecommendInput = z.infer<typeof RecommendInputSchema>;

export const RecommendOutputSchema = z.object({
  items: z.array(z.any()), // RankedItem[] from lens.ts
  page: z.number().int().min(0),
  nextPage: z.number().int().nullable(),
  totalHits: z.number().int().optional(),
  degraded: z
    .enum(['rag', 'graph', 'reranker'])
    .nullable()
    .optional(), // Indicates service degradation
});

export type RecommendOutput = z.infer<typeof RecommendOutputSchema>;

// ============================================================================
// GET /api/social/oembed?platform=x&url=y - Social media embed resolution
// ============================================================================

export const OEmbedQuerySchema = z.object({
  platform: SocialPlatformSchema,
  url: z
    .string()
    .url('URL must be valid')
    .refine(
      (url) => {
        const platform = new URL(url).hostname;
        return (
          platform.includes('instagram.com') ||
          platform.includes('tiktok.com')
        );
      },
      { message: 'URL must be from Instagram or TikTok' }
    ),
});

export type OEmbedQuery = z.infer<typeof OEmbedQuerySchema>;

export const OEmbedOutputSchema = z.object({
  embedHtml: z.string().nullable().optional(), // Sanitized HTML
  posterUrl: z.string().url().nullable().optional(), // Fallback poster image
  cached: z.boolean(), // Whether response was cached
  expiresAt: z.string().datetime().optional(), // Cache expiration
});

export type OEmbedOutput = z.infer<typeof OEmbedOutputSchema>;

// ============================================================================
// Error response schema (standard across all routes)
// ============================================================================

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  traceId: z.string().optional(),
  validationErrors: z.array(z.any()).optional(), // Zod validation errors
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

// ============================================================================
// Helper function to validate and parse input
// ============================================================================

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateInputSafe<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
