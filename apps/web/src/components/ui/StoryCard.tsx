'use client';

import { motion } from 'framer-motion';
import type { RankedItem } from '@citypass/types';
import { ReasonChips } from '@/components/chat/ReasonChips';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

type StoryCardProps = {
  item: RankedItem;
  onOpen: (item: RankedItem) => void;
  traceId?: string;
  slateLabel?: string;
  index?: number;
};

export function StoryCard({ item, onOpen, traceId, slateLabel = 'chat', index = 0 }: StoryCardProps) {
  const eventTime = new Date(item.startTime);

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="relative flex min-w-[260px] max-w-[280px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-b from-white/10 via-transparent to-black/20 text-white shadow-[0_15px_80px_rgba(2,0,19,0.6)]"
      onClick={() => onOpen(item)}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center bg-black/40 text-white/50">CityLens</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/80">
          <span className="rounded-full bg-white/10 px-3 py-1">{item.neighborhood ?? item.category ?? 'City'}</span>
          <span className="rounded-full bg-black/50 px-3 py-1">{item.distanceKm ? `${item.distanceKm}km` : 'nearby'}</span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">Because you like {item.category ?? 'this vibe'}</p>
          <h3 className="mt-1 text-xl font-semibold leading-tight">{item.title}</h3>
          <p className="text-sm text-white/60">
            {eventTime.toLocaleDateString([], { weekday: 'short' })} · {eventTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </p>
        </div>
        <ReasonChips reasons={item.reasons} />
        <div className="flex gap-2 text-xs text-white/70">
          <span className="rounded-full border border-white/15 px-3 py-1">{item.priceMin ? `$${item.priceMin}` : 'Free'}{item.priceMax ? ` - $${item.priceMax}` : ''}</span>
          <span className="rounded-full border border-white/15 px-3 py-1">Fit {item.fitScore?.toFixed?.(2) ?? '0.0'}</span>
        </div>
        <div className="mt-auto flex gap-2 text-sm">
          <button
            className="flex-1 rounded-full bg-white text-black py-2 font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              logClientEvent('card_view', { screen: 'chat', slateLabel, traceId, eventId: item.id, position: index, viewType: 'open_modal' });
              onOpen(item);
            }}
          >
            Details
          </button>
          {item.bookingUrl && (
            <a
              href={item.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap rounded-full border border-white/20 px-3 py-2 text-white"
              onClick={(e) => {
                e.stopPropagation();
                logClientEvent('click_book', { screen: 'chat', slateLabel, traceId, eventId: item.id, position: index, viewType: 'open_event' });
              }}
            >
              Open event page
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}
