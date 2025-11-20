'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IntentionTokens, RankedItem } from '@citypass/types';
import { FilterBar } from './FilterBar';
import { StoryCard } from '@/components/chat/StoryCard';
import { SkeletonStoryCard } from '@/components/chat/SkeletonStoryCard';
import { EmptyFeedState } from './EmptyFeedState';
import { EventModal } from '@/components/chat/EventModal';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

const DEFAULT_TOKENS: IntentionTokens = {
  mood: 'electric',
  untilMinutes: 240,
  distanceKm: 5,
  budget: 'casual',
  companions: ['solo'],
};

type FeedShellProps = {
  city: string;
  defaultMood: IntentionTokens['mood'];
  presetIds?: string[] | null;
  initialTokens?: Partial<IntentionTokens>;
};

type TimeFilter = 'now' | 'today' | 'tonight' | 'weekend';
type DistanceFilter = 'walkable' | 'short' | 'open';

export function FeedShell({ city, defaultMood, presetIds, initialTokens }: FeedShellProps) {
  const [tokens, setTokens] = useState<IntentionTokens>({
    ...DEFAULT_TOKENS,
    ...initialTokens,
    mood: initialTokens?.mood ?? defaultMood,
  });
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('short');
  const [items, setItems] = useState<RankedItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | undefined>();
  const [selected, setSelected] = useState<{ item: RankedItem; index: number } | null>(null);

  const idsKey = useMemo(() => JSON.stringify(presetIds ?? []), [presetIds]);
  const resolvedIds = useMemo(() => {
    try {
      const parsed = JSON.parse(idsKey) as string[];
      return parsed.length ? parsed : undefined;
    } catch {
      return undefined;
    }
  }, [idsKey]);

  const fetchFeed = useCallback(async () => {
    setStatus('loading');
    setError(null);
    logClientEvent('query', {
      screen: 'feed',
      intention: tokens,
      source: 'feed',
    });

    try {
      const response = await fetch('/api/lens/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intention: { tokens, city },
          ids: resolvedIds,
        }),
      });
      if (!response.ok) {
        throw new Error('Unable to load CityLens feed');
      }
      const payload = (await response.json()) as { items: RankedItem[]; traceId?: string };
      setItems(payload.items);
      setTraceId(payload.traceId);
      if (payload.items?.length) {
        logClientEvent('slate_impression', {
          screen: 'feed',
          traceId: payload.traceId,
          slateLabel: 'feed_primary',
          eventIds: payload.items.map((item) => item.id),
          intention: tokens,
        });
      }
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
      logClientEvent('error', { screen: 'feed', message: err instanceof Error ? err.message : 'Unknown', intention: tokens });
    }
  }, [city, tokens, resolvedIds]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('citylens:intention');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTokens((prev) => ({ ...prev, ...parsed, mood: parsed.mood ?? prev.mood }));
      }
    } catch {
      // ignore hydration errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('citylens:intention', JSON.stringify(tokens));
  }, [tokens]);

  const handleMoodChange = (value: IntentionTokens['mood']) => {
    setTokens((prev) => ({ ...prev, mood: value }));
  };

  const handleTimeChange = (value: TimeFilter) => {
    setTimeFilter(value);
    const until = value === 'now' ? 90 : value === 'today' ? 6 * 60 : value === 'tonight' ? 12 * 60 : 72 * 60;
    setTokens((prev) => ({ ...prev, untilMinutes: until }));
  };

  const handleDistanceChange = (value: DistanceFilter) => {
    setDistanceFilter(value);
    const distance = value === 'walkable' ? 2 : value === 'short' ? 6 : 15;
    setTokens((prev) => ({ ...prev, distanceKm: distance }));
  };

  const isLoading = status === 'loading';

  return (
    <section className="flex h-full min-h-0 flex-col text-white">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">CityLens feed</p>
        <h1 className="text-2xl font-semibold">Browse things to do</h1>
        <p className="text-sm text-white/70">Tuned to your recent searches and saved vibes.</p>
      </div>
      <div className="mt-4 flex-1 min-h-0 overflow-y-auto space-y-6 pb-6">
        <FilterBar
          mood={tokens.mood}
          time={timeFilter}
          distance={distanceFilter}
          onMoodChange={handleMoodChange}
          onTimeChange={handleTimeChange}
          onDistanceChange={handleDistanceChange}
        />
        {status === 'error' && (
          <div className="rounded-3xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error ?? 'We could not load the feed.'}{' '}
            <button type="button" className="underline" onClick={fetchFeed}>
              Try again
            </button>
          </div>
        )}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonStoryCard key={index} />
            ))}
          </div>
        )}
        {!isLoading && !error && items.length === 0 && <EmptyFeedState />}
        {!isLoading && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item, index) => (
              <StoryCard
                key={item.id}
                item={item}
                onOpen={() => setSelected({ item, index })}
                slateLabel="feed_primary"
                traceId={traceId}
                index={index}
              />
            ))}
          </div>
        )}
      </div>
      <EventModal
        item={selected?.item ?? null}
        onClose={() => setSelected(null)}
        traceId={traceId}
        slateLabel="feed_primary"
        position={selected?.index}
      />
    </section>
  );
}
