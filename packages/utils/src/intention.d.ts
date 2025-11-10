import { Intention, IntentionTokens } from '@citypass/types';
export interface IntentionOptions {
    city?: string;
    sessionId?: string;
    userId?: string;
    now?: Date;
    profileTokens?: Partial<IntentionTokens>;
    cookie?: string | null;
    overrides?: Partial<IntentionTokens>;
}
export declare function parseIntentionCookie(rawCookie?: string | null): Partial<IntentionTokens>;
export declare function serializeIntention(tokens: IntentionTokens): string;
export declare function normalizeMood(mood?: string): IntentionTokens['mood'] | undefined;
export declare function normalizeBudget(budget?: string): IntentionTokens['budget'] | undefined;
export declare function normalizeCompanions(companions?: string | string[]): IntentionTokens['companions'] | undefined;
export declare function buildIntention(options?: IntentionOptions): Intention;
//# sourceMappingURL=intention.d.ts.map