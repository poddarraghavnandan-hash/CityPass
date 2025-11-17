import type { IntentionTokens } from '@citypass/types';
import { PageShell } from '@/components/layout/PageShell';
import { FeedShell } from '@/components/feed/FeedShell';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { cookies } from 'next/headers';
import { parsePreferencesCookie } from '@/lib/preferences';

export const metadata = {
  title: 'CityLens Feed',
};

interface FeedPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

const moods: IntentionTokens['mood'][] = ['calm', 'social', 'electric', 'artistic', 'grounded'];

export default function FeedPage({ searchParams }: FeedPageProps) {
  const moodParam = (searchParams?.mood as string) || 'electric';
  const defaultMood = moods.includes(moodParam as IntentionTokens['mood'])
    ? (moodParam as IntentionTokens['mood'])
    : 'electric';
  const presetIds = typeof searchParams?.ids === 'string' ? searchParams.ids.split(',').filter(Boolean) : null;
  const city = (searchParams?.city as string) || process.env.NEXT_PUBLIC_DEFAULT_CITY || 'New York';
  const prefCookie = cookies().get('citylens_prefs')?.value;
  const prefs = parsePreferencesCookie(prefCookie);

  return (
    <PageShell>
      <div className="space-y-8">
        <SectionTitle
          eyebrow="CityLens Feed"
          title="Story cards stitched directly from the city"
          description="Swipeable slates, context modals, and a single live neon stack."
        />
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
      </div>
    </PageShell>
  );
}
