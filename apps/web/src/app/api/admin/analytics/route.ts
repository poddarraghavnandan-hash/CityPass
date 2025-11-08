/**
 * Admin API - Analytics Dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';

export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin users

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch analytics events
    const events = await prisma.analyticsEvent.findMany({
      where: {
        occurredAt: { gte: startDate },
      },
      select: {
        type: true,
        sessionId: true,
        userId: true,
        eventId: true,
      },
    });

    // Calculate overview stats
    const totalEvents = events.length;
    const uniqueUsers = new Set(events.filter((e) => e.userId).map((e) => e.userId)).size;
    const uniqueSessions = new Set(events.map((e) => e.sessionId)).size;
    const avgEventsPerSession = uniqueSessions > 0 ? totalEvents / uniqueSessions : 0;

    // Event breakdown by type
    const eventCounts: Record<string, number> = {};
    events.forEach((event) => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });

    const eventBreakdown = Object.entries(eventCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: count / totalEvents,
      }))
      .sort((a, b) => b.count - a.count);

    // Top events by views and saves
    const eventActivity: Record<string, { views: number; saves: number; title?: string }> = {};

    events.forEach((event) => {
      if (!event.eventId) return;

      if (!eventActivity[event.eventId]) {
        eventActivity[event.eventId] = { views: 0, saves: 0 };
      }

      if (event.type === 'VIEW') {
        eventActivity[event.eventId].views++;
      } else if (event.type === 'SAVE') {
        eventActivity[event.eventId].saves++;
      }
    });

    // Get event titles
    const eventIds = Object.keys(eventActivity);
    const eventsData = await prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true },
    });

    eventsData.forEach((e) => {
      if (eventActivity[e.id]) {
        eventActivity[e.id].title = e.title;
      }
    });

    const topEvents = Object.entries(eventActivity)
      .map(([eventId, data]) => ({
        eventId,
        title: data.title || 'Unknown Event',
        views: data.views,
        saves: data.saves,
        conversionRate: data.views > 0 ? data.saves / data.views : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Ad performance
    const adBudgets = await prisma.adBudget.findMany({
      select: {
        spent: true,
        impressions: true,
        clicks: true,
        conversions: true,
      },
    });

    const adPerformance = {
      totalImpressions: adBudgets.reduce((sum, b) => sum + b.impressions, 0),
      totalClicks: adBudgets.reduce((sum, b) => sum + b.clicks, 0),
      totalConversions: adBudgets.reduce((sum, b) => sum + b.conversions, 0),
      totalSpend: adBudgets.reduce((sum, b) => sum + b.spent, 0),
      avgCTR: 0,
      avgCPC: 0,
    };

    if (adPerformance.totalImpressions > 0) {
      adPerformance.avgCTR = adPerformance.totalClicks / adPerformance.totalImpressions;
    }

    if (adPerformance.totalClicks > 0) {
      adPerformance.avgCPC = adPerformance.totalSpend / adPerformance.totalClicks;
    }

    return NextResponse.json({
      overview: {
        totalEvents,
        totalUsers: uniqueUsers,
        totalSessions: uniqueSessions,
        avgEventsPerSession,
      },
      eventBreakdown,
      topEvents,
      adPerformance,
      range,
      startDate,
      endDate: now,
    });
  } catch (error) {
    console.error('Admin analytics fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
