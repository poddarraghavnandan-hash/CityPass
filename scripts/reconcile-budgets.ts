/**
 * Daily budget reconciliation job for ad campaigns
 * Resets daily spend counters and checks campaign status
 */

import { PrismaClient } from '@citypass/db';

const prisma = new PrismaClient();

async function reconcileBudgets() {
  console.log('💰 Starting daily budget reconciliation...');

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Get all active campaigns
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        budget: true,
      },
    });

    console.log(`📊 Processing ${campaigns.length} active campaigns...`);

    let reconciled = 0;
    let paused = 0;
    let ended = 0;

    for (const campaign of campaigns) {
      try {
        const budget = campaign.budget;

        if (!budget) {
          console.warn(`⚠️  Campaign ${campaign.id} has no budget record`);
          continue;
        }

        // Check if we need to reset daily spend
        const lastResetDate = budget.todayDate || new Date(0);
        const lastResetDay = lastResetDate.toISOString().split('T')[0];

        if (lastResetDay !== today) {
          // Reset daily counters
          await prisma.adBudget.update({
            where: { id: budget.id },
            data: {
              todaySpent: 0,
              todayDate: new Date(),
            },
          });

          console.log(`🔄 Reset daily budget for campaign: ${campaign.name}`);
          reconciled++;
        }

        // Check if total budget exhausted
        if (budget.spent >= campaign.totalBudget) {
          await prisma.adCampaign.update({
            where: { id: campaign.id },
            data: { status: 'ENDED' },
          });

          console.log(`🛑 Campaign ended (budget exhausted): ${campaign.name}`);
          ended++;
          continue;
        }

        // Check if campaign end date passed
        if (campaign.endDate && new Date() > campaign.endDate) {
          await prisma.adCampaign.update({
            where: { id: campaign.id },
            data: { status: 'ENDED' },
          });

          console.log(`🛑 Campaign ended (date passed): ${campaign.name}`);
          ended++;
          continue;
        }

        // Check daily pacing
        if (campaign.pacing === 'EVEN') {
          const daysRemaining =
            campaign.endDate
              ? Math.max(
                  1,
                  Math.ceil(
                    (campaign.endDate.getTime() - Date.now()) /
                      (24 * 60 * 60 * 1000)
                  )
                )
              : 30; // Default to 30 days if no end date

          const remainingBudget = campaign.totalBudget - budget.spent;
          const targetDailySpend = remainingBudget / daysRemaining;

          // If spending too fast, pause temporarily
          if (
            campaign.dailyBudget &&
            budget.todaySpent >= campaign.dailyBudget * 1.5
          ) {
            await prisma.adCampaign.update({
              where: { id: campaign.id },
              data: { status: 'PAUSED' },
            });

            console.log(
              `⏸️  Campaign paused (overspending): ${campaign.name} (${budget.todaySpent.toFixed(2)} / ${campaign.dailyBudget})`
            );
            paused++;
          }
        }
      } catch (error) {
        console.error(`❌ Error reconciling campaign ${campaign.id}:`, error);
      }
    }

    // Clean up old impressions (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const { count: deletedImpressions } = await prisma.adImpression.deleteMany({
      where: {
        occurredAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`\n🎉 Reconciliation complete!`);
    console.log(`  ✅ Reconciled: ${reconciled} campaigns`);
    console.log(`  ⏸️  Paused: ${paused} campaigns (overspending)`);
    console.log(`  🛑 Ended: ${ended} campaigns`);
    console.log(`  🗑️  Cleaned up: ${deletedImpressions} old impressions`);

  } catch (error) {
    console.error('💥 Fatal error in reconciliation job:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  reconcileBudgets()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { reconcileBudgets };
