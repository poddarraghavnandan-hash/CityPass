'use client';

// Force dynamic rendering for this page (uses localStorage and client-side data fetching)
export const dynamic = 'force-dynamic';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { IntentionTokens, RankedItem } from '@citypass/types';
import { MoodRail } from '@/components/lens/MoodRail';
import { NowBar } from '@/components/lens/NowBar';
import { FeedCard } from '@/components/lens/FeedCard';
import { ContextModal } from '@/components/lens/ContextModal';
import { PlanDrawer } from '@/components/lens/PlanDrawer';
import { CirclePanel } from '@/components/lens/CirclePanel';
import { useAnalytics } from '@citypass/analytics';
import type { MoodKey } from '@/theme/lensTheme';
import { useSearchParams } from 'next/navigation';

interface LensResponse {
  items: RankedItem[];
  hasMore: boolean;
  slates?: PlanSlates | null;
}

interface PlanSlates {
  best?: RankedItem[];
  wildcard?: RankedItem[];
  closeAndEasy?: RankedItem[];
}

const DEFAULT_TOKENS: IntentionTokens = {
  mood: 'calm',
  untilMinutes: 150,
  distanceKm: 5,
  budget: 'casual',
  companions: ['solo'],
};

function CityLensFeed() {
  const searchParams = useSearchParams();
  const presetIds = useMemo(() => {
    const idsParam = searchParams.get('ids');
    return idsParam ? idsParam.split(',').map(part => part.trim()).filter(Boolean) : null;
  }, [searchParams]);
  const queryMood = searchParams.get('mood') as MoodKey | null;
  const derivedCity = searchParams.get('city') || process.env.NEXT_PUBLIC_DEFAULT_CITY || 'New York';

  const [tokens, setTokens] = useState<IntentionTokens>({
    ...DEFAULT_TOKENS,
    mood: queryMood || DEFAULT_TOKENS.mood,
  });
  const [city] = useState<string>(derivedCity);
  const [items, setItems] = useState<RankedItem[]>([]);
  const [selected, setSelected] = useState<RankedItem | null>(null);
  const [slates, setSlates] = useState<PlanSlates | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loadingMore'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [ingestionStatus, setIngestionStatus] = useState<'idle' | 'requesting' | 'queued' | 'completed' | 'error'>('idle');
  const [ingestionMessage, setIngestionMessage] = useState<string | null>(null);
  const [ingestionRequestId, setIngestionRequestId] = useState<string | null>(null);
  const analytics = useAnalytics();

  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 560,
    overscan: 2,
  });

  const mood = tokens.mood as MoodKey;

  useEffect(() => {
    const stored = localStorage.getItem('citylens:intention');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTokens(prev => ({
          ...parsed,
          mood: queryMood || parsed.mood,
        }));
      } catch {
        // ignore
      }
    }
  }, [queryMood]);

  useEffect(() => {
    localStorage.setItem('citylens:intention', JSON.stringify(tokens));
  }, [tokens]);

  const fetchPage = useCallback(
    async (pageToLoad: number): Promise<LensResponse> => {
      const response = await fetch('/api/lens/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intention: { tokens, city },
          page: pageToLoad,
          ids: presetIds || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error('Unable to load CityLens feed');
      }
      return response.json();
    },
    [tokens, city, presetIds]
  );

  const loadFirstPage = useCallback(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    fetchPage(1)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setSlates(data.slates ?? null);
        setHasMore(data.hasMore);
        setPage(1);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setStatus('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  useEffect(() => {
    const cleanup = loadFirstPage();
    return cleanup;
  }, [loadFirstPage]);

  const loadMore = useCallback(() => {
    if (status === 'loadingMore' || !hasMore) return;
    setStatus('loadingMore');
    fetchPage(page + 1)
      .then((data) => {
        setItems(prev => [...prev, ...data.items]);
        if (data.slates) {
          setSlates(data.slates);
        }
        setHasMore(data.hasMore);
        setPage(prev => prev + 1);
      })
      .finally(() => setStatus('idle'));
  }, [fetchPage, page, hasMore, status]);

  const virtualItems = virtualizer.getVirtualItems();
  useEffect(() => {
    const last = virtualItems.at(-1);
    if (last && last.index >= items.length - 3) {
      if (hasMore && status === 'idle') {
        loadMore();
      }
    }
  }, [virtualItems, items.length, hasMore, status, loadMore]);

  const activeIndex = virtualItems[0]?.index ?? 0;

  const handleMoodChange = (next: MoodKey) => {
    setTokens(prev => ({ ...prev, mood: next }));
  };

  const handleTokenUpdate = (partial: Partial<IntentionTokens>) => {
    setTokens(prev => ({ ...prev, ...partial }));
  };

  const requestIngestion = useCallback(async () => {
    if (ingestionStatus === 'requesting' || ingestionStatus === 'queued') return;
    setIngestionStatus('requesting');
    setIngestionMessage(null);
    try {
      const response = await fetch('/api/lens/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intention: { tokens, city },
          ingestionRequest: {
            city,
            reason: 'citylens-empty-feed',
            priority: 2,
          },
        }),
      });
      if (!response.ok) {
        throw new Error('Unable to queue ingestion request');
      }
      const data = await response.json();
      setIngestionRequestId(data.request?.id ?? null);
      setIngestionStatus('queued');
      setIngestionMessage('We are gathering fresh events for you. This usually takes a couple of minutes.');
    } catch (err: any) {
      setIngestionStatus('error');
      setIngestionMessage(err.message ?? 'Failed to queue ingestion request.');
    }
  }, [city, tokens, ingestionStatus]);

  useEffect(() => {
    if (!ingestionRequestId || ingestionStatus !== 'queued') return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/lens/recommend?requestId=${ingestionRequestId}`);
        if (!response.ok) return;
        const data = await response.json();
        const status = data.request?.status;
        if (status === 'COMPLETED') {
          setIngestionStatus('completed');
          setIngestionMessage('New recommendations are ready.');
          loadFirstPage();
          setIngestionRequestId(null);
        } else if (status === 'FAILED') {
          setIngestionStatus('error');
          setIngestionMessage(data.request?.lastError || 'Unable to complete ingestion request.');
          setIngestionRequestId(null);
        }
      } catch {
        // ignore polling errors
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [ingestionRequestId, ingestionStatus, loadFirstPage]);


  const handleImpression = useCallback(
    (eventId: string) => {
      analytics.track({
        type: 'IMPRESSION',
        eventId,
        props: { surface: 'citylens' },
      });
    },
    [analytics]
  );

  const handleSave = useCallback(
    (eventId: string) => {
      analytics.track({
        type: 'SAVE',
        eventId,
        props: { surface: 'citylens' },
      });
    },
    [analytics]
  );

  return (
    <div className="lens-shell">
      <MoodRail value={mood} onChange={handleMoodChange} />

      {error && (
        <div className="px-4 text-red-300">{error}</div>
      )}

      <div ref={parentRef} className="lens-scroll px-4 space-y-6">
        {status === 'idle' && items.length === 0 && (
          <div className="text-center text-white/70 py-10 space-y-4 border border-white/10 rounded-lg px-4">
            <p>No recommendations yet. We can fetch fresh events for {city}.</p>
            {ingestionMessage && (
              <p className="text-sm text-white/60">{ingestionMessage}</p>
            )}
            <button
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 transition text-sm"
              onClick={requestIngestion}
              disabled={ingestionStatus === 'requesting' || ingestionStatus === 'queued'}
            >
              {ingestionStatus === 'queued'
                ? 'Ingestion queued'
                : ingestionStatus === 'requesting'
                  ? 'Requesting…'
                  : 'Request fresh events'}
            </button>
          </div>
        )}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = items[virtualRow.index];
            if (!item) return null;
            return (
              <div
                key={item.id}
                className="absolute left-0 w-full pt-4"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <FeedCard
                  item={item}
                  mood={mood}
                  isActive={virtualRow.index === activeIndex}
                  onOpenContext={setSelected}
                  onSave={handleSave}
                  onImpression={handleImpression}
                />
              </div>
            );
          })}
        </div>

        {status === 'loading' && (
          <p className="text-center text-white/60 py-4">Tuning your city lens…</p>
        )}
        {status === 'loadingMore' && (
          <p className="text-center text-white/60 py-4">Loading more</p>
        )}
      </div>

      <PlanDrawer slates={slates} fallback={items.slice(0, 3)} />
      <CirclePanel companions={tokens.companions} />
      <NowBar tokens={tokens} onUpdate={handleTokenUpdate} />

      <ContextModal item={selected} companions={tokens.companions} onClose={() => setSelected(null)} />
    </div>
  );
}

export default function CityLensFeedPage() {
  return (
    <Suspense fallback={<div className="lens-shell min-h-screen flex items-center justify-center text-white/60">Loading...</div>}>
      <CityLensFeed />
    </Suspense>
  );
}
