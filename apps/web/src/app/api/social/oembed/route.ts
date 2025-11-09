import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSocialOEmbed } from '@citypass/social';

const QuerySchema = z.object({
  platform: z.enum(['instagram', 'tiktok']),
  url: z.string().url(),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const query = QuerySchema.parse({
      platform: searchParams.get('platform'),
      url: searchParams.get('url'),
    });

    const data = await getSocialOEmbed(query.platform, query.url);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.flatten() },
        { status: 400 }
      );
    }

    console.error('social/oembed error', error);
    return NextResponse.json(
      { error: 'Failed to resolve embed' },
      { status: 502 }
    );
  }
}
