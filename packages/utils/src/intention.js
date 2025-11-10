import { Buffer } from 'node:buffer';
import { IntentionTokensSchema, MoodSchema, BudgetTierSchema, CompanionSchema, } from '@citypass/types';
const DEFAULT_TOKENS = {
    mood: 'calm',
    untilMinutes: 180,
    distanceKm: 5,
    budget: 'casual',
    companions: ['solo'],
};
function decodeMaybeBase64(value) {
    try {
        return Buffer.from(value, 'base64url').toString('utf8');
    }
    catch {
        try {
            return Buffer.from(value, 'base64').toString('utf8');
        }
        catch {
            return value;
        }
    }
}
export function parseIntentionCookie(rawCookie) {
    if (!rawCookie)
        return {};
    const trimmed = rawCookie.trim();
    try {
        const decoded = trimmed.startsWith('{') ? trimmed : decodeURIComponent(decodeMaybeBase64(trimmed));
        const parsed = JSON.parse(decoded);
        return IntentionTokensSchema.partial().parse(parsed);
    }
    catch {
        return {};
    }
}
export function serializeIntention(tokens) {
    const payload = JSON.stringify(tokens);
    return Buffer.from(payload, 'utf8').toString('base64url');
}
export function normalizeMood(mood) {
    if (!mood)
        return undefined;
    const normalized = mood.toLowerCase();
    if (MoodSchema.options.includes(normalized)) {
        return normalized;
    }
    return undefined;
}
export function normalizeBudget(budget) {
    if (!budget)
        return undefined;
    const normalized = budget.toLowerCase();
    if (BudgetTierSchema.options.includes(normalized)) {
        return normalized;
    }
    return undefined;
}
export function normalizeCompanions(companions) {
    if (!companions)
        return undefined;
    const list = Array.isArray(companions) ? companions : companions.split(',');
    const normalized = list
        .map(value => value.trim().toLowerCase())
        .filter((value) => CompanionSchema.options.includes(value));
    return normalized.length > 0 ? normalized : undefined;
}
export function buildIntention(options = {}) {
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
//# sourceMappingURL=intention.js.map