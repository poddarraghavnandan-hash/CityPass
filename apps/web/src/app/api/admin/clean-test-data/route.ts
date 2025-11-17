import { NextResponse } from 'next/server';
import { prisma } from '@citypass/db';

/**
 * Delete all test/seed events from the database
 * Identifies test events by sourceDomain containing 'test.com' or 'citypass-seed.com'
 */
export async function POST() {
  try {
    // Delete all events from test domains
    const result = await prisma.event.deleteMany({
      where: {
        OR: [
          { sourceDomain: { contains: 'test.com' } },
          { sourceDomain: { contains: 'citypass-seed.com' } },
          { sourceDomain: { contains: 'seed' } },
        ],
      },
    });

    console.log(`🗑️ Deleted ${result.count} test events`);

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Deleted ${result.count} test events`,
    });
  } catch (error: any) {
    console.error('Clean test data error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
