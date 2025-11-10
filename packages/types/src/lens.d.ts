import { z } from 'zod';
export declare const MoodSchema: z.ZodEnum<{
    calm: "calm";
    social: "social";
    electric: "electric";
    artistic: "artistic";
    grounded: "grounded";
}>;
export type Mood = z.infer<typeof MoodSchema>;
export declare const BudgetTierSchema: z.ZodEnum<{
    free: "free";
    casual: "casual";
    splurge: "splurge";
}>;
export type BudgetTier = z.infer<typeof BudgetTierSchema>;
export declare const CompanionSchema: z.ZodEnum<{
    solo: "solo";
    partner: "partner";
    crew: "crew";
    family: "family";
}>;
export type Companion = z.infer<typeof CompanionSchema>;
export declare const SocialPlatformSchema: z.ZodEnum<{
    instagram: "instagram";
    tiktok: "tiktok";
}>;
export type SocialPlatform = z.infer<typeof SocialPlatformSchema>;
export declare const IntentionTokensSchema: z.ZodObject<{
    mood: z.ZodEnum<{
        calm: "calm";
        social: "social";
        electric: "electric";
        artistic: "artistic";
        grounded: "grounded";
    }>;
    untilMinutes: z.ZodDefault<z.ZodNumber>;
    distanceKm: z.ZodDefault<z.ZodNumber>;
    budget: z.ZodDefault<z.ZodEnum<{
        free: "free";
        casual: "casual";
        splurge: "splurge";
    }>>;
    companions: z.ZodDefault<z.ZodArray<z.ZodEnum<{
        solo: "solo";
        partner: "partner";
        crew: "crew";
        family: "family";
    }>>>;
}, z.core.$strip>;
export type IntentionTokens = z.infer<typeof IntentionTokensSchema>;
export declare const IntentionSchema: z.ZodObject<{
    city: z.ZodString;
    nowISO: z.ZodString;
    tokens: z.ZodObject<{
        mood: z.ZodEnum<{
            calm: "calm";
            social: "social";
            electric: "electric";
            artistic: "artistic";
            grounded: "grounded";
        }>;
        untilMinutes: z.ZodDefault<z.ZodNumber>;
        distanceKm: z.ZodDefault<z.ZodNumber>;
        budget: z.ZodDefault<z.ZodEnum<{
            free: "free";
            casual: "casual";
            splurge: "splurge";
        }>>;
        companions: z.ZodDefault<z.ZodArray<z.ZodEnum<{
            solo: "solo";
            partner: "partner";
            crew: "crew";
            family: "family";
        }>>>;
    }, z.core.$strip>;
    source: z.ZodDefault<z.ZodEnum<{
        cookie: "cookie";
        profile: "profile";
        inline: "inline";
        inferred: "inferred";
    }>>;
    sessionId: z.ZodOptional<z.ZodString>;
    userId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type Intention = z.infer<typeof IntentionSchema>;
export declare const SocialPreviewSchema: z.ZodObject<{
    id: z.ZodString;
    eventId: z.ZodString;
    platform: z.ZodEnum<{
        instagram: "instagram";
        tiktok: "tiktok";
    }>;
    url: z.ZodString;
    caption: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    authorName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    authorHandle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    publishedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    likeCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    commentCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    viewCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    posterUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    embedHtml: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    attributionUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type SocialPreview = z.infer<typeof SocialPreviewSchema>;
export declare const RankedReasonSchema: z.ZodObject<{
    id: z.ZodString;
    label: z.ZodString;
    weight: z.ZodNumber;
}, z.core.$strip>;
export type RankedReason = z.infer<typeof RankedReasonSchema>;
export declare const RankedItemSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    subtitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    venueName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    neighborhood: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    city: z.ZodString;
    startTime: z.ZodString;
    endTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    priceMin: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    priceMax: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    imageUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    bookingUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    distanceKm: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    fitScore: z.ZodNumber;
    moodScore: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    socialHeat: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    sponsored: z.ZodDefault<z.ZodBoolean>;
    reasons: z.ZodDefault<z.ZodArray<z.ZodString>>;
    socialPreview: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        id: z.ZodString;
        eventId: z.ZodString;
        platform: z.ZodEnum<{
            instagram: "instagram";
            tiktok: "tiktok";
        }>;
        url: z.ZodString;
        caption: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        authorName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        authorHandle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        avatarUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        publishedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        likeCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        commentCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        viewCount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
        posterUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        embedHtml: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        attributionUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>>>;
    patronLabel: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    adDisclosure: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type RankedItem = z.infer<typeof RankedItemSchema>;
//# sourceMappingURL=lens.d.ts.map