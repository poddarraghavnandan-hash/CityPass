import 'dotenv/config';
import { prisma } from '@citypass/db';

async function main() {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const count = await prisma.event.count({
        where: {
            city: 'New York',
            startTime: {
                gte: now,
                lte: threeDaysFromNow
            }
        }
    });

    console.log(`Current NYC events in next 3 days: ${count.toLocaleString()}`);
    console.log(`Target: 100,000`);
    console.log(`Gap: ${(100000 - count).toLocaleString()}`);
    console.log(`Percentage of target: ${((count / 100000) * 100).toFixed(2)}%`);
}

main().catch(console.error).finally(() => process.exit(0));
