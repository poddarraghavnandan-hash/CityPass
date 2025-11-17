import { NextRequest, NextResponse } from 'next/server';
import { prisma, SourceType, EventCategory, CrawlMethod } from '@citypass/db';
import { z } from 'zod';

const CreateSourceSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  domain: z.string().min(1),
  city: z.string().min(1),
  sourceType: z.nativeEnum(SourceType),
  category: z.nativeEnum(EventCategory).optional(),
  crawlMethod: z.nativeEnum(CrawlMethod).optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { events: true },
        },
      },
    });

    return NextResponse.json({ sources });
  } catch (error: any) {
    console.error('Sources API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = CreateSourceSchema.parse(body);

    const source = await prisma.source.create({
      data: {
        ...data,
        crawlMethod: data.crawlMethod || CrawlMethod.FIRECRAWL,
        active: data.active ?? true,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error: any) {
    console.error('Create source error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
