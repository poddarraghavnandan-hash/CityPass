import { NextResponse } from 'next/server';

/**
 * Legacy seed endpoint disabled.
 * Kept to avoid breaking links; returns 410 Gone to indicate worker-owned ingestion.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Seed ingestion now runs inside the background worker. Manual seeding via /api/seed-events has been disabled.',
    },
    { status: 410 }
  );
}
