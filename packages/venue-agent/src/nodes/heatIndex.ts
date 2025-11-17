/**
 * Heat Index Computation Node
 * Computes composite heat scores for venues
 */

import type { CityIngestionContext } from '../types';
import { prisma } from '@citypass/db';

/**
 * Compute venue heat index
 */
export async function computeVenueHeatIndex(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[HeatIndexAgent] Computing heat indices for ${context.city.name}...`);

  try {
    // Get all venues in the city
    const venues = await prisma.venue.findMany({
      where: { city: context.city.name, isActive: true },
      include: {
        signals: {
          where: {
            window: 'WEEKLY',
            computedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        _count: {
          select: { events: true },
        },
      },
    });

    console.log(`[HeatIndexAgent] Computing heat for ${venues.length} venues`);

    for (const venue of venues) {
      // Calculate composite score
      let score = 0;

      // Event activity (40% weight)
      const eventCount = venue._count.events;
      const eventScore = Math.min(eventCount / 10, 1.0) * 40;
      score += eventScore;

      // Social heat (30% weight) - from signals
      const socialSignal = venue.signals.find(s => s.signalType === 'SOCIAL_HEAT');
      const socialScore = socialSignal ? (socialSignal.value / 100) * 30 : 0;
      score += socialScore;

      // Rating (20% weight) - from signals
      const ratingSignal = venue.signals.find(s => s.signalType === 'RATING');
      const ratingScore = ratingSignal ? (ratingSignal.value / 5) * 20 : 0;
      score += ratingScore;

      // User traffic (10% weight) - from signals
      const trafficSignal = venue.signals.find(s => s.signalType === 'USER_TRAFFIC');
      const trafficScore = trafficSignal ? Math.min(trafficSignal.value / 1000, 1.0) * 10 : 0;
      score += trafficScore;

      // Upsert heat index
      await prisma.venueHeatIndex.upsert({
        where: { venueId: venue.id },
        create: {
          venueId: venue.id,
          compositeScore: score,
          lastComputedAt: new Date(),
        },
        update: {
          compositeScore: score,
          lastComputedAt: new Date(),
        },
      });
    }

    console.log(`[HeatIndexAgent] Heat indices computed for ${venues.length} venues`);

    return context;
  } catch (error: any) {
    console.error(`[HeatIndexAgent] Error:`, error);
    context.errors.push({
      agentName: 'HeatIndexAgent',
      source: 'SYSTEM',
      message: error.message,
      timestamp: new Date(),
    });
    return context;
  }
}
