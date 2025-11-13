import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Direct test-event creation is disabled. Use the ingestion request API to queue priority jobs.',
    },
    { status: 410 }
  );
}
