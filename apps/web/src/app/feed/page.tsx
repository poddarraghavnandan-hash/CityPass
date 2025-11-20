import type { IntentionTokens } from '@citypass/types';
import { FeedShell } from '@/components/feed/FeedShell';
import { cookies } from 'next/headers';
import { parsePreferencesCookie } from '@/lib/preferences';
import { PageShell } from '@/components/layout/PageShell';

export const metadata = {
  title: 'CityLens Feed',
};

interface FeedPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const moods: IntentionTokens['mood'][] = ['calm', 'social', 'electric', 'artistic', 'grounded'];

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const params = await searchParams;
  const moodParam = (params?.mood as string) || 'electric';
  const defaultMood = moods.includes(moodParam as IntentionTokens['mood'])
    ? (moodParam as IntentionTokens['mood'])
    : 'electric';
  const presetIds = typeof params?.ids === 'string' ? params.ids.split(',').filter(Boolean) : null;
  const city = (params?.city as string) || process.env.NEXT_PUBLIC_DEFAULT_CITY || 'New York';
  const prefCookie = (await cookies()).get('citylens_prefs')?.value;
  const prefs = parsePreferencesCookie(prefCookie);

  return (
    <PageShell>
      <FeedShell
        city={city}
        defaultMood={prefs?.mood ?? defaultMood}
        presetIds={presetIds}
        initialTokens={{
          mood: prefs?.mood ?? defaultMood,
          distanceKm: prefs?.distanceKm ?? undefined,
          budget: prefs?.budget ?? undefined,
        }}
      />
    </PageShell>
  );
}
