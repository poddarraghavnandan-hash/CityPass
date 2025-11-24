import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check database status
 * GET /api/debug/db
 */
export async function GET(request: NextRequest) {
    try {
        // Check database connection and count events
        const [totalEvents, futureEvents, sources, venues] = await Promise.all([
            prisma.event.count(),
            prisma.event.count({
                where: {
                    startTime: {
                        gte: new Date(),
                    },
                },
            }),
            prisma.source.count(),
            prisma.venue.count(),
        ]);

        // Get sample events
        const sampleEvents = await prisma.event.findMany({
            take: 5,
            where: {
                startTime: {
                    gte: new Date(),
                },
            },
            orderBy: {
                startTime: 'asc',
            },
            select: {
                id: true,
                title: true,
                city: true,
                startTime: true,
                category: true,
                venueName: true,
            },
        });

        // Test a typical query
        const testQuery = await prisma.event.findMany({
            where: {
                city: 'New York',
                startTime: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            },
            take: 10,
            select: {
                id: true,
                title: true,
                startTime: true,
            },
        });

        return NextResponse.json({
            success: true,
            database: {
                connected: true,
                totalEvents,
                futureEvents,
                sources,
                venues,
            },
            sampleEvents,
            testQuery: {
                query: 'New York, next 7 days',
                count: testQuery.length,
                events: testQuery,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('Database check failed:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                database: {
                    connected: false,
                },
            },
            { status: 500 }
        );
    }
}
