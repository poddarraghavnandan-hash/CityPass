'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IntentionTokens, RankedItem } from '@citypass/types';
import { MoodRail } from './MoodRail';
import { NowBar } from './NowBar';
import { FilterBar } from './FilterBar';
import { StoryRow } from './StoryRow';
import { ContextModal } from './ContextModal';
import { SkeletonStoryCard } from './SkeletonStoryCard';
import { FeedEmptyState } from './EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

const DEFAULT_TOKENS: IntentionTokens = {
  mood: 'electric',
  untilMinutes: 180,
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

export function FeedShell({ city, defaultMood, presetIds, initialTokens }: FeedShellProps) {
  const [tokens, setTokens] = useState<IntentionTokens>({ ...DEFAULT_TOKENS, ...initialTokens, mood: initialTokens?.mood ?? defaultMood });
  const [timeWindow, setTimeWindow] = useState('tonight');
  const [items, setItems] = useState<RankedItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RankedItem | null>(null);
  const [traceId, setTraceId] = useState<string | undefined>(undefined);

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
          scores: payload.items.map((item: any) => item.fitScore).filter((v) => typeof v === 'number'),
          position: 0,
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
    } catch (err) {
      console.warn('Failed to hydrate feed tokens', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('citylens:intention', JSON.stringify(tokens));
  }, [tokens]);

  const isLoading = status === 'loading';

  return (
    <div className="space-y-8">
      <MoodRail
        value={tokens.mood}
        onChange={(mood) => setTokens((prev) => ({ ...prev, mood }))}
        onLog={(mood) =>
          logClientEvent('query', {
            screen: 'feed',
            intention: { ...tokens, mood },
            source: 'feed',
          })
        }
      />
      <NowBar city={city} tokens={tokens} />
      <FilterBar
        distanceKm={tokens.distanceKm}
        onDistanceChange={(distanceKm) => setTokens((prev) => ({ ...prev, distanceKm }))}
        budget={tokens.budget}
        onBudgetChange={(budget) => setTokens((prev) => ({ ...prev, budget }))}
        timeWindow={timeWindow}
        onTimeWindowChange={(value) => {
          setTimeWindow(value);
          const until = value === 'now' ? 90 : value === 'this weekend' ? 72 * 60 : 6 * 60;
          setTokens((prev) => ({ ...prev, untilMinutes: until }));
        }}
        onLog={(payload) =>
          logClientEvent('query', {
            screen: 'feed',
            intention: { ...tokens, ...payload },
            source: 'feed',
          })
        }
      />
      {status === 'error' && <ErrorState description={error ?? undefined} onRetry={fetchFeed} />}
      {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonStoryCard key={index} />
          ))}
        </div>
      )}
      {!isLoading && !error && items.length === 0 && <FeedEmptyState />}
      {!isLoading && items.length > 0 && (
        <StoryRow items={items} onOpen={setSelected} traceId={traceId} slateLabel="feed_primary" />
      )}
      <ContextModal item={selected} onClose={() => setSelected(null)} traceId={traceId} slateLabel="feed_primary" />
    </div>
  );
}
