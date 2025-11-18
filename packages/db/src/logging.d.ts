import type { EventLogType, ModelType } from '@prisma/client';
export interface LogEventOptions {
    userId?: string;
    anonId?: string;
    sessionId: string;
    traceId: string;
    eventType: EventLogType;
    payload: Record<string, any>;
}
export declare function logEvent(eventType: EventLogType | string, payload: Record<string, any>, context: {
    userId?: string;
    anonId?: string;
    sessionId: string;
    traceId: string;
}): Promise<void>;
export declare function logEventLegacy(options: LogEventOptions): Promise<void>;
export declare function logModelVersionIfNeeded(name: string, type: ModelType, version: string, config?: Record<string, any>): Promise<{
    id: string;
}>;
export declare function getCurrentSlatePolicy(): Promise<{
    name: string;
    params: Record<string, any>;
} | null>;
export declare function upsertSlatePolicy(name: string, params: Record<string, any>, isActive?: boolean): Promise<void>;
export declare function getLatestRankerSnapshot(): Promise<{
    id: string;
    weights: Record<string, any>;
    metricsJson: Record<string, any> | null;
} | null>;
export declare function createRankerSnapshot(modelVersionId: string, weights: Record<string, any>, metricsJson?: Record<string, any>, trainingStats?: Record<string, any>): Promise<void>;
export declare function batchLogEvents(events: LogEventOptions[]): Promise<void>;
export declare function queryEventLogs(filters: {
    userId?: string;
    sessionId?: string;
    traceId?: string;
    eventType?: EventLogType;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
}): Promise<Array<{
    id: string;
    userId: string | null;
    sessionId: string;
    traceId: string;
    eventType: string;
    payload: any;
    createdAt: Date;
}>>;
//# sourceMappingURL=logging.d.ts.map