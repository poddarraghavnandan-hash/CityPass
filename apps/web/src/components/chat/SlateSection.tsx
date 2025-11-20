'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Intention, RankedItem } from '@citypass/types';
import { StoryCard } from './StoryCard';
import { SkeletonStoryCard } from './SkeletonStoryCard';
import { Chip } from '@/components/ui/Chip';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

export type SlateKey = 'best' | 'wildcard' | 'closeAndEasy';

const tabs: Array<{ key: SlateKey; label: string }> = [
  { key: 'best', label: 'Best matches' },
  { key: 'wildcard', label: 'Wildcard ideas' },
  { key: 'closeAndEasy', label: 'Close & easy' },
];

type SlateSectionProps = {
  slates: Partial<Record<SlateKey, RankedItem[]>> | null;
  loading?: boolean;
  traceId?: string;
  intention?: Intention | null;
  onOpen: (item: RankedItem, index: number, slateLabel: SlateKey) => void;
};

export function SlateSection({ slates, loading, traceId, intention, onOpen }: SlateSectionProps) {
  const [active, setActive] = useState<SlateKey>('best');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [active, slates]);

  const items = useMemo(() => (slates ? slates[active] || [] : []), [slates, active]);
  const visible = expanded ? items : items.slice(0, 4);
  const hasMore = items.length > visible.length;

  if (loading && !slates) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[#0B111D]/80 p-4 shadow-[0_20px_40px_rgba(5,5,12,0.45)]">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Chip key={tab.key} variant="soft" size="sm">
              {tab.label}
            </Chip>
          ))}
        </div>
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <SkeletonStoryCard key={index} />
          ))}
        </div>
      </section>
    );
  }

  if (!slates) {
    return (
      <section className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-sm text-white/70">
        Ask CityLens for literally anything—from a quiet afternoon work spot to a high-energy Thursday night—and your curated cards will appear here.
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#0B111D]/80 p-4 shadow-[0_25px_60px_rgba(5,5,12,0.55)]">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <Chip
              key={tab.key}
              variant={isActive ? 'solid' : 'soft'}
              size="sm"
              active={isActive}
              onClick={() => {
                setActive(tab.key);
                if (slates[tab.key]?.length) {
                  logClientEvent('slate_impression', {
                    screen: 'chat',
                    traceId,
                    slateLabel: tab.key,
                    eventIds: slates[tab.key]?.map((item) => item.id),
                    intention,
                  });
                }
              }}
            >
              {tab.label}
            </Chip>
          );
        })}
      </div>
      <div className="mt-4 space-y-4">
        {visible.length ? (
          visible.map((item, index) => (
            <StoryCard key={item.id} item={item} index={index} slateLabel={active} traceId={traceId} onOpen={() => onOpen(item, index, active)} />
          ))
        ) : (
          <p className="text-sm text-white/60">No matches for this vibe yet.</p>
        )}
        {hasMore && (
          <button
            type="button"
            className="w-full rounded-2xl border border-white/20 bg-white/5 py-3 text-sm font-medium text-white hover:bg-white/10"
            onClick={() => setExpanded(true)}
          >
            See more ideas
          </button>
        )}
      </div>
    </section>
  );
}
