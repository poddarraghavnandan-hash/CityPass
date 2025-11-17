/**
 * Social Signals Agent (STUB)
 * TODO: Implement social media heat signals from TikTok, Instagram, Snapchat, Reddit
 */

import type { CityIngestionContext } from '../types';

/**
 * Fetch social signals for venues (STUB IMPLEMENTATION)
 *
 * TODO: Future implementation should:
 * 1. Query TikTok API for location-tagged videos and hashtags
 * 2. Query Instagram API for location-tagged posts
 * 3. Query Snapchat Snap Map API for heatmap data
 * 4. Query Reddit API for city-specific subreddit mentions
 * 5. Compute aggregate "social heat" score per venue
 * 6. Return as RawVenue entries or signal data
 *
 * Challenges:
 * - Rate limits and API access
 * - Need to match social mentions to canonical venues
 * - Temporal decay of signals
 * - Privacy considerations
 *
 * Suggested approach:
 * - Use venue name + lat/lon to search social platforms
 * - Aggregate mentions/check-ins/tags over rolling 7-day window
 * - Normalize to 0-100 heat score
 * - Store as VenueSignal with type=SOCIAL_HEAT
 */
export async function fetchSocialSignals(
  context: CityIngestionContext
): Promise<CityIngestionContext> {
  console.log(`[SocialSignalsAgent] Running in stub mode...`);

  // TODO: Implement actual social signal fetching

  // For now, log as degraded mode
  console.warn(
    `[SocialSignalsAgent] Social signal ingestion not yet implemented. ` +
      `This is a stub that returns no data.`
  );

  console.log(
    `[SocialSignalsAgent] Future implementation will query:
    - TikTok Location API for video counts and engagement
    - Instagram Places API for post counts and trends
    - Snapchat Snap Map API for heat data
    - Reddit API for venue mentions in city subreddits

    Each venue will receive a composite social heat score (0-100) based on:
    - Mention frequency (weighted by recency)
    - Engagement metrics (likes, shares, comments)
    - User check-ins and location tags
    - Trending status

    This data will be stored as VenueSignal entries with signalType=SOCIAL_HEAT
    and will feed into the VenueHeatIndex calculation.`
  );

  // No venues to add
  context.stats.socialSignals = 0;

  return context;
}

/**
 * Placeholder function for future social signal computation
 *
 * @param venueName - Canonical venue name
 * @param lat - Venue latitude
 * @param lon - Venue longitude
 * @param city - City name
 * @returns Social heat score and metadata
 */
export async function getSocialHeatForVenue(
  venueName: string,
  lat?: number,
  lon?: number,
  city?: string
): Promise<{
  heatScore: number;
  sources: Array<'TIKTOK' | 'INSTAGRAM' | 'SNAPCHAT' | 'REDDIT'>;
  meta: Record<string, any>;
}> {
  // TODO: Implement actual social signal fetching

  return {
    heatScore: 0,
    sources: [],
    meta: {
      reason: 'stub_implementation',
      message: 'Social signal fetching not yet implemented',
    },
  };
}
