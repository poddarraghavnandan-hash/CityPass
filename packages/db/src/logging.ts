/**
 * Logging and Feature Store Helpers
 * Centralized functions for event logging, model versioning, and feature tracking
 */

import { prisma } from './index';
import type { EventLogType, ModelType } from '@prisma/client';

export interface LogEventOptions {
  userId?: string;
  anonId?: string;
  sessionId: string;
  traceId: string;
  eventType: EventLogType;
  payload: Record<string, any>;
}

/**
 * Log an event to the event_logs table
 * Fail-soft: logs to console if DB is unavailable
 */
export async function logEvent(
  eventType: EventLogType | string,
  payload: Record<string, any>,
  context: {
    userId?: string;
    anonId?: string;
    sessionId: string;
    traceId: string;
  }
): Promise<void> {
  try {
    await prisma.eventLog.create({
      data: {
        userId: context.userId,
        anonId: context.anonId,
        sessionId: context.sessionId,
        traceId: context.traceId,
        eventType: eventType as EventLogType,
        payload,
      },
    });
  } catch (error) {
    console.error('[logEvent] Failed to log event to DB:', error);
    console.log('[logEvent] Event details:', {
      eventType,
      traceId: context.traceId,
      payload,
    });
    // TODO: Consider implementing a fallback queue or retry mechanism
  }
}

/**
 * Log an event using the old signature (for backwards compatibility)
 */
export async function logEventLegacy(options: LogEventOptions): Promise<void> {
  return logEvent(options.eventType, options.payload, {
    userId: options.userId,
    anonId: options.anonId,
    sessionId: options.sessionId,
    traceId: options.traceId,
  });
}

/**
 * Log model version if it doesn't exist
 * Returns the model version record
 */
export async function logModelVersionIfNeeded(
  name: string,
  type: ModelType,
  version: string,
  config?: Record<string, any>
): Promise<{ id: string }> {
  try {
    // Check if version exists
    const existing = await prisma.modelVersion.findFirst({
      where: { name, version },
      select: { id: true },
    });

    if (existing) {
      return existing;
    }

    // Create new version
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
  } catch (error) {
    console.error('[logModelVersionIfNeeded] Failed to log model version:', error);
    // Return a placeholder ID so the system can continue
    return { id: `placeholder-${name}-${version}` };
  }
}

/**
 * Get the current active slate policy
 */
export async function getCurrentSlatePolicy(): Promise<{
  name: string;
  params: Record<string, any>;
} | null> {
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
      params: policy.params as Record<string, any>,
    };
  } catch (error) {
    console.error('[getCurrentSlatePolicy] Failed to fetch active policy:', error);
    return null;
  }
}

/**
 * Create or update a slate policy
 */
export async function upsertSlatePolicy(
  name: string,
  params: Record<string, any>,
  isActive: boolean = false
): Promise<void> {
  try {
    await prisma.slatePolicy.upsert({
      where: { name },
      update: { params, isActive, updatedAt: new Date() },
      create: { name, params, isActive },
    });

    console.log(`✅ Upserted slate policy: ${name} (active: ${isActive})`);
  } catch (error) {
    console.error('[upsertSlatePolicy] Failed to upsert policy:', error);
  }
}

/**
 * Get the latest ranker snapshot
 */
export async function getLatestRankerSnapshot(): Promise<{
  id: string;
  weights: Record<string, any>;
  metricsJson: Record<string, any> | null;
} | null> {
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
      weights: snapshot.weights as Record<string, any>,
      metricsJson: snapshot.metricsJson as Record<string, any> | null,
    };
  } catch (error) {
    console.error('[getLatestRankerSnapshot] Failed to fetch ranker snapshot:', error);
    return null;
  }
}

/**
 * Create a new ranker snapshot
 */
export async function createRankerSnapshot(
  modelVersionId: string,
  weights: Record<string, any>,
  metricsJson?: Record<string, any>,
  trainingStats?: Record<string, any>
): Promise<void> {
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
  } catch (error) {
    console.error('[createRankerSnapshot] Failed to create snapshot:', error);
  }
}

/**
 * Batch log multiple events efficiently
 */
export async function batchLogEvents(events: LogEventOptions[]): Promise<void> {
  if (events.length === 0) return;

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
  } catch (error) {
    console.error('[batchLogEvents] Failed to batch log events:', error);
    // Fallback to individual logging
    console.log('[batchLogEvents] Falling back to individual event logging...');
    for (const event of events) {
      await logEventLegacy(event);
    }
  }
}

/**
 * Query event logs with filters
 */
export async function queryEventLogs(filters: {
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
}>> {
  try {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.sessionId) where.sessionId = filters.sessionId;
    if (filters.traceId) where.traceId = filters.traceId;
    if (filters.eventType) where.eventType = filters.eventType;

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    const logs = await prisma.eventLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 100,
    });

    return logs;
  } catch (error) {
    console.error('[queryEventLogs] Failed to query event logs:', error);
    return [];
  }
}
