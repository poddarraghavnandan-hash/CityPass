import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@citypass/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      include: {
        venue: true,
        source: true,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error('Event API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
