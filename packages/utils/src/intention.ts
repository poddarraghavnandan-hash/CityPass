import { Buffer } from 'node:buffer';
import {
  Intention,
  IntentionTokens,
  IntentionTokensSchema,
  MoodSchema,
  BudgetTierSchema,
  CompanionSchema,
} from '@citypass/types/lens';

export interface IntentionOptions {
  city?: string;
  sessionId?: string;
  userId?: string;
  now?: Date;
  profileTokens?: Partial<IntentionTokens>;
  cookie?: string | null;
  overrides?: Partial<IntentionTokens>;
}

const DEFAULT_TOKENS: IntentionTokens = {
  mood: 'calm',
  untilMinutes: 180,
  distanceKm: 5,
  budget: 'casual',
  companions: ['solo'],
};

function decodeMaybeBase64(value: string): string {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    try {
      return Buffer.from(value, 'base64').toString('utf8');
    } catch {
      return value;
    }
  }
}

export function parseIntentionCookie(rawCookie?: string | null): Partial<IntentionTokens> {
  if (!rawCookie) return {};

  const trimmed = rawCookie.trim();
  try {
    const decoded = trimmed.startsWith('{') ? trimmed : decodeURIComponent(decodeMaybeBase64(trimmed));
    const parsed = JSON.parse(decoded);
    return IntentionTokensSchema.partial().parse(parsed);
  } catch {
    return {};
  }
}

export function serializeIntention(tokens: IntentionTokens): string {
  const payload = JSON.stringify(tokens);
  return Buffer.from(payload, 'utf8').toString('base64url');
}

export function normalizeMood(mood?: string): IntentionTokens['mood'] | undefined {
  if (!mood) return undefined;
  const normalized = mood.toLowerCase();
  if (MoodSchema.options.includes(normalized as any)) {
    return normalized as IntentionTokens['mood'];
  }
  return undefined;
}

export function normalizeBudget(budget?: string): IntentionTokens['budget'] | undefined {
  if (!budget) return undefined;
  const normalized = budget.toLowerCase();
  if (BudgetTierSchema.options.includes(normalized as any)) {
    return normalized as IntentionTokens['budget'];
  }
  return undefined;
}

export function normalizeCompanions(companions?: string | string[]): IntentionTokens['companions'] | undefined {
  if (!companions) return undefined;
  const list = Array.isArray(companions) ? companions : companions.split(',');
  const normalized = list
    .map(value => value.trim().toLowerCase())
    .filter((value): value is IntentionTokens['companions'][number] =>
      CompanionSchema.options.includes(value as any)
    );
  return normalized.length > 0 ? (normalized as IntentionTokens['companions']) : undefined;
}

export function buildIntention(options: IntentionOptions = {}): Intention {
  const freeze = process.env.FREEZE_TIME_ISO;
  const now = options.now ?? (freeze ? new Date(freeze) : new Date());
  const cookieTokens = parseIntentionCookie(options.cookie);

  const merged = {
    ...DEFAULT_TOKENS,
    ...cookieTokens,
    ...options.profileTokens,
    ...options.overrides,
  };

  const tokens = IntentionTokensSchema.parse(merged);

  return {
    city: options.city || process.env.STAGING_CITY || 'New York',
    nowISO: now.toISOString(),
    tokens,
    source: options.cookie ? 'cookie' : options.profileTokens ? 'profile' : options.overrides ? 'inline' : 'inferred',
    sessionId: options.sessionId,
    userId: options.userId,
  };
}
