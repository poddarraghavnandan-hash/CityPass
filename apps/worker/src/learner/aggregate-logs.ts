/**
 * Aggregate Event Logs for Learning
 * Processes event_logs to derive training signals and labels
 */

import { prisma } from '@citypass/db';

export interface AggregatedInteraction {
  eventId: string;
  impressions: number;
  views: number;
  clicks: number;
  saves: number;
  hides: number;
  avgPosition: number;
  ctr: number; // Click-through rate
  saveRate: number;
  hideRate: number;
  relevanceLabel: 'positive' | 'negative' | 'neutral';
  relevanceScore: number; // 0-1
}

/**
 * Aggregate event logs from a time window
 * @param fromDate - Start of time window
 * @param toDate - End of time window
 * @returns Aggregated interaction stats per event
 */
export async function aggregateEventLogs(
  fromDate: Date,
  toDate: Date
): Promise<AggregatedInteraction[]> {
  try {
    console.log(`📊 [aggregate-logs] Aggregating logs from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    // Fetch all relevant logs
    const logs = await prisma.eventLog.findMany({
      where: {
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
        eventType: {
          in: ['SLATE_IMPRESSION', 'CARD_VIEW', 'CLICK_ROUTE', 'CLICK_BOOK', 'SAVE', 'HIDE'],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`📊 [aggregate-logs] Processing ${logs.length} log entries`);

    // Group by event ID
    const eventStats = new Map<string, {
      impressions: number;
      views: number;
      clicks: number;
      saves: number;
      hides: number;
      positions: number[];
    }>();

    for (const log of logs) {
      const payload = log.payload as any;

      // Handle slate impressions
      if (log.eventType === 'SLATE_IMPRESSION' && payload.eventIds) {
        for (let i = 0; i < payload.eventIds.length; i++) {
          const eventId = payload.eventIds[i];
          const position = payload.eventPositions?.[i] ?? i;

          if (!eventStats.has(eventId)) {
            eventStats.set(eventId, {
              impressions: 0,
              views: 0,
              clicks: 0,
              saves: 0,
              hides: 0,
              positions: [],
            });
          }

          const stats = eventStats.get(eventId)!;
          stats.impressions += 1;
          stats.positions.push(position);
        }
      }

      // Handle card views
      if (log.eventType === 'CARD_VIEW' && payload.eventId) {
        const eventId = payload.eventId;

        if (!eventStats.has(eventId)) {
          eventStats.set(eventId, {
            impressions: 0,
            views: 0,
            clicks: 0,
            saves: 0,
            hides: 0,
            positions: [],
          });
        }

        eventStats.get(eventId)!.views += 1;
      }

      // Handle clicks
      if ((log.eventType === 'CLICK_ROUTE' || log.eventType === 'CLICK_BOOK') && payload.eventId) {
        const eventId = payload.eventId;

        if (!eventStats.has(eventId)) {
          eventStats.set(eventId, {
            impressions: 0,
            views: 0,
            clicks: 0,
            saves: 0,
            hides: 0,
            positions: [],
          });
        }

        eventStats.get(eventId)!.clicks += 1;
      }

      // Handle saves
      if (log.eventType === 'SAVE' && payload.eventId) {
        const eventId = payload.eventId;

        if (!eventStats.has(eventId)) {
          eventStats.set(eventId, {
            impressions: 0,
            views: 0,
            clicks: 0,
            saves: 0,
            hides: 0,
            positions: [],
          });
        }

        eventStats.get(eventId)!.saves += 1;
      }

      // Handle hides
      if (log.eventType === 'HIDE' && payload.eventId) {
        const eventId = payload.eventId;

        if (!eventStats.has(eventId)) {
          eventStats.set(eventId, {
            impressions: 0,
            views: 0,
            clicks: 0,
            saves: 0,
            hides: 0,
            positions: [],
          });
        }

        eventStats.get(eventId)!.hides += 1;
      }
    }

    // Convert to aggregated interactions
    const aggregated: AggregatedInteraction[] = [];

    for (const [eventId, stats] of eventStats.entries()) {
      const avgPosition = stats.positions.length > 0
        ? stats.positions.reduce((sum, p) => sum + p, 0) / stats.positions.length
        : 0;

      const ctr = stats.impressions > 0 ? stats.clicks / stats.impressions : 0;
      const saveRate = stats.impressions > 0 ? stats.saves / stats.impressions : 0;
      const hideRate = stats.impressions > 0 ? stats.hides / stats.impressions : 0;

      // Compute relevance label and score
      let relevanceLabel: 'positive' | 'negative' | 'neutral' = 'neutral';
      let relevanceScore = 0.5;

      if (stats.saves > 0 || stats.clicks >= 2) {
        relevanceLabel = 'positive';
        relevanceScore = Math.min(1.0, 0.5 + saveRate * 0.5 + ctr * 0.3);
      } else if (stats.hides > 0 || (stats.impressions >= 3 && stats.views === 0)) {
        relevanceLabel = 'negative';
        relevanceScore = Math.max(0.0, 0.3 - hideRate * 0.5);
      } else if (stats.views > 0) {
        relevanceLabel = 'neutral';
        relevanceScore = 0.4 + (stats.views / (stats.impressions + 1)) * 0.2;
      }

      aggregated.push({
        eventId,
        impressions: stats.impressions,
        views: stats.views,
        clicks: stats.clicks,
        saves: stats.saves,
        hides: stats.hides,
        avgPosition,
        ctr,
        saveRate,
        hideRate,
        relevanceLabel,
        relevanceScore,
      });
    }

    console.log(
      `✅ [aggregate-logs] Aggregated ${aggregated.length} events:`,
      `${aggregated.filter(a => a.relevanceLabel === 'positive').length} positive,`,
      `${aggregated.filter(a => a.relevanceLabel === 'negative').length} negative,`,
      `${aggregated.filter(a => a.relevanceLabel === 'neutral').length} neutral`
    );

    return aggregated;
  } catch (error) {
    console.error('[aggregate-logs] Failed to aggregate logs:', error);
    return [];
  }
}

/**
 * Export aggregated interactions as training data (JSONL format)
 */
export async function exportTrainingData(
  fromDate: Date,
  toDate: Date,
  outputPath: string
): Promise<void> {
  const aggregated = await aggregateEventLogs(fromDate, toDate);

  // TODO: Write to file or S3
  console.log(`📝 [export-training-data] Would export ${aggregated.length} rows to ${outputPath}`);
  console.log('[export-training-data] Sample:', aggregated.slice(0, 3));
}
