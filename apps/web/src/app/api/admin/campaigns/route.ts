/**
 * Admin API - Campaign Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';

export async function GET(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin users

    const campaigns = await prisma.adCampaign.findMany({
      include: {
        budgets: true,
        creatives: {
          select: {
            id: true,
            kind: true,
            status: true,
          },
        },
        targetings: {
          select: {
            id: true,
            cities: true,
            categories: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Flatten budget data for easier consumption
    const campaignsWithBudget = campaigns.map((campaign) => ({
      ...campaign,
      _budget: campaign.budgets[0] || {
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        viewable: 0,
      },
      budgets: undefined, // Remove to avoid duplication
    }));

    return NextResponse.json({
      campaigns: campaignsWithBudget,
      total: campaigns.length,
    });
  } catch (error) {
    console.error('Admin campaigns fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin users

    const body = await req.json();
    const {
      name,
      advertiser,
      dailyBudget,
      totalBudget,
      pacing = 'EVEN',
      startDate,
      endDate,
    } = body;

    // Create campaign
    const campaign = await prisma.adCampaign.create({
      data: {
        name,
        advertiser,
        dailyBudget: parseFloat(dailyBudget),
        totalBudget: parseFloat(totalBudget),
        pacing,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        status: 'ACTIVE',
        qualityScore: 1.0,
      },
    });

    // Initialize budget
    await prisma.adBudget.create({
      data: {
        campaignId: campaign.id,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        viewable: 0,
        todaySpent: 0,
        todayDate: new Date(),
      },
    });

    return NextResponse.json({
      campaign,
      success: true,
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
