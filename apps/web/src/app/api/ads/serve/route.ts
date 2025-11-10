/**
 * Ad Serving API - Second-Price Auction with Quality Score
 * Implements targeting, frequency capping, budget pacing, and viewability
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';
import { z } from 'zod';
import {
  matchesTargeting,
  calculateQualityScore,
  checkBudgetAndPacing,
  checkFrequencyCap,
  runAuction,
  AdContext,
  AdCandidate,
} from '@citypass/search';

const AdServeRequestSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  city: z.string(),
  query: z.string().optional(),
  category: z.string().optional(),
  neighborhood: z.string().optional(),
  priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
  slot: z.enum(['FEED_P3', 'FEED_P10', 'FEED_END', 'MAP_PIN', 'DETAIL_SIDEBAR', 'SEARCH_INTERSTITIAL', 'HEADER_BANNER']),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params = AdServeRequestSchema.parse(body);

    // Check advertising consent
    const consent = await prisma.userConsent.findUnique({
      where: { sessionId: params.sessionId },
    });

    if (!consent?.advertising) {
      return NextResponse.json(
        { ad: null, reason: 'Advertising consent not given' },
        { status: 403 }
      );
    }

    // Build ad context
    const now = new Date();
    const hour = now.getHours();
    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'late';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else if (hour < 22) timeOfDay = 'evening';
    else timeOfDay = 'late';

    const adContext: AdContext = {
      sessionId: params.sessionId,
      userId: params.userId,
      city: params.city,
      query: params.query,
      category: params.category,
      neighborhood: params.neighborhood,
      priceRange: params.priceRange,
      timeOfDay,
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'short' }),
      slot: params.slot,
    };

    // Step 1: Get eligible campaigns (active, within date range)
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        creatives: {
          where: { status: 'ACTIVE' },
        },
        targetings: true,
        budgets: true,
      },
    });

    // Step 2: Filter and score candidates
    const candidates: AdCandidate[] = [];

    for (const campaign of campaigns) {
      // Check budget
      const budget = campaign.budgets[0];
      if (!budget) continue;

      const budgetCheck = await checkBudgetAndPacing(campaign, budget, prisma);
      if (!budgetCheck.canServe) continue;

      // Check frequency cap
      const freqCheck = await checkFrequencyCap(
        campaign.id,
        params.sessionId,
        3, // Max 3 per day
        prisma
      );
      if (!freqCheck.canServe) continue;

      // Check each targeting + creative combination
      for (const targeting of campaign.targetings) {
        const targetMatch = matchesTargeting(targeting, adContext);
        if (!targetMatch.matches) continue;

        for (const creative of campaign.creatives) {
          // Get historical CTR (placeholder - would come from aggregated data)
          const historicalCTR = 0.02; // 2% default

          const qualityScore = calculateQualityScore(campaign, creative, historicalCTR);

          // Base bid (CPM)
          const baseBid = 5.0; // $5 CPM default

          candidates.push({
            campaign: campaign as any,
            creative,
            targeting,
            targetingScore: targetMatch.score,
            qualityScore,
            bid: baseBid,
          });
        }
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        ad: null,
        reason: 'No eligible ads',
      });
    }

    // Step 3: Run auction
    const auctionResult = runAuction(candidates);

    if (!auctionResult) {
      return NextResponse.json({
        ad: null,
        reason: 'Auction failed',
      });
    }

    const { winner, price } = auctionResult;

    // Step 4: Log impression
    const impression = await prisma.adImpression.create({
      data: {
        campaignId: winner.campaign.id,
        creativeId: winner.creative.id,
        sessionId: params.sessionId,
        userId: params.userId || null,
        slot: params.slot,
        city: params.city,
        query: params.query || null,
      },
    });

    // Step 5: Update budget
    const cpmCost = price / 1000; // Convert to cost per impression
    await prisma.adBudget.update({
      where: { campaignId: winner.campaign.id },
      data: {
        spent: { increment: cpmCost },
        impressions: { increment: 1 },
        todaySpent: { increment: cpmCost },
        todayDate: now,
      },
    });

    // Step 6: Update frequency cap
    const resetDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await prisma.adFrequencyCap.upsert({
      where: {
        campaignId_sessionId: {
          campaignId: winner.campaign.id,
          sessionId: params.sessionId,
        },
      },
      create: {
        campaignId: winner.campaign.id,
        sessionId: params.sessionId,
        count: 1,
        lastShownAt: now,
        resetsAt: resetDate,
      },
      update: {
        count: { increment: 1 },
        lastShownAt: now,
      },
    });

    // Step 7: Return ad creative
    return NextResponse.json({
      ad: {
        impressionId: impression.id,
        campaignId: winner.campaign.id,
        creativeId: winner.creative.id,
        kind: winner.creative.kind,
        title: winner.creative.title,
        body: winner.creative.body,
        imageUrl: winner.creative.imageUrl,
        clickUrl: winner.creative.clickUrl,
        eventId: winner.creative.eventId,
        slot: params.slot,
      },
      targeting: {
        score: winner.targetingScore,
        qualityScore: winner.qualityScore,
      },
      auction: {
        price: price.toFixed(4),
        candidatesCount: candidates.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Ad serve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
