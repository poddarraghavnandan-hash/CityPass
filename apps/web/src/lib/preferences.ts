import { z } from 'zod';
import { BudgetTierSchema, MoodSchema } from '@citypass/types';

export const PreferencesSchema = z.object({
  mood: MoodSchema.default('electric'),
  interests: z.array(z.string()).max(12).default([]),
  distanceKm: z.number().min(1).max(50).default(5),
  budget: BudgetTierSchema.default('casual'),
  socialProof: z.boolean().default(true),
  soloFriendly: z.boolean().default(false),
  // Advanced settings
  dislikes: z.array(z.string()).max(10).default([]),
  scheduleBias: z.enum(['morning', 'afternoon', 'evening', 'night', 'flexible']).optional(),
  socialStyle: z.enum(['solo', 'small_groups', 'large_crowds', 'flexible']).optional(),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

export function parsePreferencesCookie(raw?: string | null): Preferences | null {
  if (!raw) return null;
  try {
    const parsed = PreferencesSchema.parse(JSON.parse(raw));
    return parsed;
  } catch {
    return null;
  }
}
