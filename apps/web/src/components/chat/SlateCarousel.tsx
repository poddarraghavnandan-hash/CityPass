'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Intention, RankedItem } from '@citypass/types';
import { StoryCard } from './StoryCard';
import { SkeletonStoryCard } from './SkeletonStoryCard';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

type SlateKey = 'best' | 'wildcard' | 'closeAndEasy';
const tabs: Array<{ key: SlateKey; label: string }> = [
  { key: 'best', label: 'Best' },
  { key: 'wildcard', label: 'Wildcard' },
  { key: 'closeAndEasy', label: 'Close & Easy' },
];

type SlateCarouselProps = {
  slates: Partial<Record<SlateKey, RankedItem[]>> | null;
  loading?: boolean;
  traceId?: string;
  intention?: Intention | null;
  onOpen: (item: RankedItem, index: number, slateLabel: string) => void;
};

export function SlateCarousel({ slates, loading, traceId, intention, onOpen }: SlateCarouselProps) {
  const [active, setActive] = useState<SlateKey>('best');

  const current = useMemo(() => (slates ? slates[active] || [] : []), [slates, active]);

  if (loading && !slates) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 text-xs text-white/60">
          {tabs.map((tab) => (
            <span key={tab.key} className="rounded-full bg-white/5 px-3 py-1">
              {tab.label}
            </span>
          ))}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonStoryCard key={idx} />
          ))}
        </div>
      </div>
    );
  }

  if (!slates) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-xs text-white/70">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActive(tab.key);
              if (slates[tab.key]?.length) {
                logClientEvent('slate_impression', {
                  screen: 'chat',
                  traceId,
                  slateLabel: tab.key,
                  eventIds: slates[tab.key]?.map((ev) => ev.id),
                  intention,
                });
              }
            }}
            className={`rounded-full px-3 py-1 ${active === tab.key ? 'bg-white text-black' : 'bg-white/5 text-white/70'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex gap-3 overflow-x-auto pb-2"
        >
          {current.length ? (
            current.map((item, idx) => (
              <StoryCard key={item.id} item={item} index={idx} slateLabel={active} traceId={traceId} onOpen={(ev) => onOpen(ev, idx, active)} />
            ))
          ) : (
            <p className="px-2 text-sm text-white/60">No matches.</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
