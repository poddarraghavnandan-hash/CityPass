import { NextResponse } from 'next/server';
import { prisma } from '@citypass/db';

export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ sources });
  } catch (error: any) {
    console.error('Sources API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
