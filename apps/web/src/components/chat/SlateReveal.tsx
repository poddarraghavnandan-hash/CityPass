'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Intention, RankedItem } from '@citypass/types';
import { StoryCard } from '@/components/ui/StoryCard';
import { SkeletonStoryCard } from '@/components/ui/SkeletonStoryCard';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

const tabs: Array<{ key: SlateKey; label: string }> = [
  { key: 'best', label: 'Best' },
  { key: 'wildcard', label: 'Wildcard' },
  { key: 'closeAndEasy', label: 'Close & Easy' },
];

type SlateKey = 'best' | 'wildcard' | 'closeAndEasy';

type SlateRevealProps = {
  slates: Partial<Record<SlateKey, RankedItem[]>> | null;
  traceId?: string;
  intention?: Intention | null;
  loading?: boolean;
  onOpen: (item: RankedItem) => void;
};

export function SlateReveal({ slates, traceId, intention, loading, onOpen }: SlateRevealProps) {
  const [activeTab, setActiveTab] = useState<SlateKey>('best');

  if (loading) {
    return (
      <div className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4">
        <div className="flex gap-2 text-sm text-white/60">
          {tabs.map((tab) => (
            <span key={tab.key} className="rounded-full bg-white/5 px-3 py-1">
              {tab.label}
            </span>
          ))}
        </div>
        <div className="flex gap-3 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, idx) => (
            <SkeletonStoryCard key={idx} />
          ))}
        </div>
      </div>
    );
  }

  if (!slates) return null;

  const current = slates[activeTab] || [];

  return (
    <div className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-2 text-sm text-white/70">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
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
            className={`rounded-full px-3 py-1 ${activeTab === tab.key ? 'bg-white text-black' : 'bg-white/5 text-white/70'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="flex gap-3 overflow-x-auto pb-2"
        >
          {current.length ? (
            current.map((item, idx) => (
              <StoryCard key={item.id} item={item} onOpen={onOpen} traceId={traceId} slateLabel={activeTab} index={idx} />
            ))
          ) : (
            <p className="px-2 text-sm text-white/60">No matches.</p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
