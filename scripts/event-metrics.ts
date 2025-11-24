import 'dotenv/config';
import { prisma } from '@citypass/db';

interface EventMetrics {
    total: number;
    next3Days: number;
    next7Days: number;
    next30Days: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    targetProgress: number;
}

async function getEventMetrics(city: string = 'New York'): Promise<EventMetrics> {
    const now = new Date();
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Total future events
    const total = await prisma.event.count({
        where: { city, startTime: { gte: now } }
    });

    // Events in next 3 days (our target window)
    const next3Days = await prisma.event.count({
        where: {
            city,
            startTime: { gte: now, lte: threeDays }
        }
    });

    // Events in next 7 days
    const next7Days = await prisma.event.count({
        where: {
            city,
            startTime: { gte: now, lte: sevenDays }
        }
    });

    // Events in next 30 days
    const next30Days = await prisma.event.count({
        where: {
            city,
            startTime: { gte: now, lte: thirtyDays }
        }
    });

    // By category
    const eventsByCategory = await prisma.event.groupBy({
        by: ['category'],
        where: {
            city,
            startTime: { gte: now, lte: threeDays }
        },
        _count: true,
    });

    const byCategory: Record<string, number> = {};
    eventsByCategory.forEach(item => {
        byCategory[item.category] = item._count;
    });

    // By source
    const eventsBySource = await prisma.event.groupBy({
        by: ['sourceId'],
        where: {
            city,
            startTime: { gte: now, lte: threeDays }
        },
        _count: true,
    });

    const bySource: Record<string, number> = {};
    for (const item of eventsBySource) {
        if (item.sourceId) {
            const source = await prisma.source.findUnique({
                where: { id: item.sourceId },
                select: { name: true }
            });
            if (source) {
                bySource[source.name] = item._count;
            }
        }
    }

    return {
        total,
        next3Days,
        next7Days,
        next30Days,
        byCategory,
        bySource,
        targetProgress: (next3Days / 100000) * 100,
    };
}

async function main() {
    console.log('📊 CityPass Event Metrics Dashboard\n');
    console.log('═'.repeat(60));

    const metrics = await getEventMetrics('New York');

    console.log('\n🎯 TARGET: 100,000 events in 3-day window');
    console.log(`\n📈 PROGRESS: ${metrics.targetProgress.toFixed(2)}%`);
    console.log(`   Current: ${metrics.next3Days.toLocaleString()} events`);
    console.log(`   Gap: ${(100000 - metrics.next3Days).toLocaleString()} events`);

    // Progress bar
    const barLength = 50;
    const filled = Math.floor((metrics.next3Days / 100000) * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    console.log(`   [${bar}]`);

    console.log('\n📅 Event Distribution:');
    console.log(`   Next 3 days:  ${metrics.next3Days.toLocaleString()}`);
    console.log(`   Next 7 days:  ${metrics.next7Days.toLocaleString()}`);
    console.log(`   Next 30 days: ${metrics.next30Days.toLocaleString()}`);
    console.log(`   Total future: ${metrics.total.toLocaleString()}`);

    if (Object.keys(metrics.byCategory).length > 0) {
        console.log('\n🏷️  Top Categories (3-day window):');
        const sortedCategories = Object.entries(metrics.byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        sortedCategories.forEach(([cat, count]) => {
            console.log(`   ${cat.padEnd(20)} ${count.toLocaleString()}`);
        });
    }

    if (Object.keys(metrics.bySource).length > 0) {
        console.log('\n📡 Top Sources (3-day window):');
        const sortedSources = Object.entries(metrics.bySource)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        sortedSources.forEach(([source, count]) => {
            const truncated = source.length > 30 ? source.substring(0, 27) + '...' : source;
            console.log(`   ${truncated.padEnd(30)} ${count.toLocaleString()}`);
        });
    }

    // Alert if below threshold
    if (metrics.next3Days < 80000) {
        console.log('\n⚠️  WARNING: Below 80% of target!');
        console.log('   Consider running additional ingestion.');
    }

    console.log('\n' + '═'.repeat(60));
}

main().catch(console.error).finally(() => process.exit(0));
