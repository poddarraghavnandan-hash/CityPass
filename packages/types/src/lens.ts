import { z } from 'zod';

export const MoodSchema = z.enum(['calm', 'social', 'electric', 'artistic', 'grounded']);
export type Mood = z.infer<typeof MoodSchema>;

export const BudgetTierSchema = z.enum(['free', 'casual', 'splurge']);
export type BudgetTier = z.infer<typeof BudgetTierSchema>;

export const CompanionSchema = z.enum(['solo', 'partner', 'crew', 'family']);
export type Companion = z.infer<typeof CompanionSchema>;

export const SocialPlatformSchema = z.enum(['instagram', 'tiktok']);
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;

export const IntentionTokensSchema = z.object({
  mood: MoodSchema,
  untilMinutes: z.number().int().min(15).max(10080).default(120), // Max 7 days
  distanceKm: z.number().min(0).max(50).default(4),
  budget: BudgetTierSchema.default('casual'),
  companions: z.array(CompanionSchema).default(['solo']),
});
export type IntentionTokens = z.infer<typeof IntentionTokensSchema>;

export const IntentionSchema = z.object({
  city: z.string(),
  nowISO: z.string().datetime(),
  tokens: IntentionTokensSchema,
  source: z.enum(['cookie', 'profile', 'inline', 'inferred']).default('inferred'),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});
export type Intention = z.infer<typeof IntentionSchema>;

export const SocialPreviewSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  platform: SocialPlatformSchema,
  url: z.string().url(),
  caption: z.string().nullable().optional(),
  authorName: z.string().nullable().optional(),
  authorHandle: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  likeCount: z.number().int().nonnegative().nullable().optional(),
  commentCount: z.number().int().nonnegative().nullable().optional(),
  viewCount: z.number().int().nonnegative().nullable().optional(),
  posterUrl: z.string().url().nullable().optional(),
  embedHtml: z.string().nullable().optional(),
  attributionUrl: z.string().url().nullable().optional(),
});
export type SocialPreview = z.infer<typeof SocialPreviewSchema>;

export const RankedReasonSchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number(),
});
export type RankedReason = z.infer<typeof RankedReasonSchema>;

export const RankedItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  neighborhood: z.string().nullable().optional(),
  city: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().nullable().optional(),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  bookingUrl: z.string().url().nullable().optional(),
  distanceKm: z.number().nullable().optional(),
  fitScore: z.number(),
  moodScore: z.number().nullable().optional(),
  socialHeat: z.number().nullable().optional(),
  sponsored: z.boolean().default(false),
  reasons: z.array(z.string()).default([]),
  socialPreview: SocialPreviewSchema.nullable().optional(),
  patronLabel: z.string().nullable().optional(),
  adDisclosure: z.string().nullable().optional(),
});
export type RankedItem = z.infer<typeof RankedItemSchema>;
