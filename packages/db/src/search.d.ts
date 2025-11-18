import type { Event, EventCategory } from '@prisma/client';
export interface DatabaseSearchOptions {
    q?: string;
    city?: string;
    category?: EventCategory;
    dateFrom?: Date;
    dateTo?: Date;
    priceMax?: number;
    limit?: number;
    offset?: number;
}
export interface DatabaseSearchResult {
    events: Event[];
    total: number;
    page: number;
    totalPages: number;
}
export declare function searchEventsInDatabase(options: DatabaseSearchOptions): Promise<DatabaseSearchResult>;
export declare function getUpcomingEvents(city: string, options?: {
    limit?: number;
    offset?: number;
    category?: EventCategory;
}): Promise<DatabaseSearchResult>;
//# sourceMappingURL=search.d.ts.map