import { prisma } from './index';
export async function logEvent(eventType, payload, context) {
    try {
        await prisma.eventLog.create({
            data: {
                userId: context.userId,
                anonId: context.anonId,
                sessionId: context.sessionId,
                traceId: context.traceId,
                eventType: eventType,
                payload,
            },
        });
    }
    catch (error) {
        console.error('[logEvent] Failed to log event to DB:', error);
        console.log('[logEvent] Event details:', {
            eventType,
            traceId: context.traceId,
            payload,
        });
    }
}
export async function logEventLegacy(options) {
    return logEvent(options.eventType, options.payload, {
        userId: options.userId,
        anonId: options.anonId,
        sessionId: options.sessionId,
        traceId: options.traceId,
    });
}
export async function logModelVersionIfNeeded(name, type, version, config) {
    try {
        const existing = await prisma.modelVersion.findFirst({
            where: { name, version },
            select: { id: true },
        });
        if (existing) {
            return existing;
        }
        const modelVersion = await prisma.modelVersion.create({
            data: {
                name,
                type,
                version,
                config: config || {},
            },
            select: { id: true },
        });
        console.log(`✅ Logged new model version: ${name}@${version}`);
        return modelVersion;
    }
    catch (error) {
        console.error('[logModelVersionIfNeeded] Failed to log model version:', error);
        return { id: `placeholder-${name}-${version}` };
    }
}
export async function getCurrentSlatePolicy() {
    try {
        const policy = await prisma.slatePolicy.findFirst({
            where: { isActive: true },
            select: { name: true, params: true },
            orderBy: { updatedAt: 'desc' },
        });
        if (!policy) {
            console.warn('[getCurrentSlatePolicy] No active slate policy found');
            return null;
        }
        return {
            name: policy.name,
            params: policy.params,
        };
    }
    catch (error) {
        console.error('[getCurrentSlatePolicy] Failed to fetch active policy:', error);
        return null;
    }
}
export async function upsertSlatePolicy(name, params, isActive = false) {
    try {
        await prisma.slatePolicy.upsert({
            where: { name },
            update: { params, isActive, updatedAt: new Date() },
            create: { name, params, isActive },
        });
        console.log(`✅ Upserted slate policy: ${name} (active: ${isActive})`);
    }
    catch (error) {
        console.error('[upsertSlatePolicy] Failed to upsert policy:', error);
    }
}
export async function getLatestRankerSnapshot() {
    try {
        const snapshot = await prisma.rankerSnapshot.findFirst({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                weights: true,
                metricsJson: true,
            },
        });
        if (!snapshot) {
            console.warn('[getLatestRankerSnapshot] No ranker snapshots found');
            return null;
        }
        return {
            id: snapshot.id,
            weights: snapshot.weights,
            metricsJson: snapshot.metricsJson,
        };
    }
    catch (error) {
        console.error('[getLatestRankerSnapshot] Failed to fetch ranker snapshot:', error);
        return null;
    }
}
export async function createRankerSnapshot(modelVersionId, weights, metricsJson, trainingStats) {
    try {
        await prisma.rankerSnapshot.create({
            data: {
                modelVersionId,
                weights,
                metricsJson: metricsJson || undefined,
                trainingStats: trainingStats || undefined,
            },
        });
        console.log(`✅ Created ranker snapshot for model version: ${modelVersionId}`);
    }
    catch (error) {
        console.error('[createRankerSnapshot] Failed to create snapshot:', error);
    }
}
export async function batchLogEvents(events) {
    if (events.length === 0)
        return;
    try {
        await prisma.eventLog.createMany({
            data: events.map(e => ({
                userId: e.userId,
                anonId: e.anonId,
                sessionId: e.sessionId,
                traceId: e.traceId,
                eventType: e.eventType,
                payload: e.payload,
            })),
            skipDuplicates: true,
        });
        console.log(`✅ Batch logged ${events.length} events`);
    }
    catch (error) {
        console.error('[batchLogEvents] Failed to batch log events:', error);
        console.log('[batchLogEvents] Falling back to individual event logging...');
        for (const event of events) {
            await logEventLegacy(event);
        }
    }
}
export async function queryEventLogs(filters) {
    try {
        const where = {};
        if (filters.userId)
            where.userId = filters.userId;
        if (filters.sessionId)
            where.sessionId = filters.sessionId;
        if (filters.traceId)
            where.traceId = filters.traceId;
        if (filters.eventType)
            where.eventType = filters.eventType;
        if (filters.fromDate || filters.toDate) {
            where.createdAt = {};
            if (filters.fromDate)
                where.createdAt.gte = filters.fromDate;
            if (filters.toDate)
                where.createdAt.lte = filters.toDate;
        }
        const logs = await prisma.eventLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: filters.limit || 100,
        });
        return logs;
    }
    catch (error) {
        console.error('[queryEventLogs] Failed to query event logs:', error);
        return [];
    }
}
//# sourceMappingURL=logging.js.map