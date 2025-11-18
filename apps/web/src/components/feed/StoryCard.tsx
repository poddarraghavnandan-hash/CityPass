import type { RankedItem } from '@citypass/types';
import { ReasonChips } from '@/components/chat/ReasonChips';
import { useEffect, useRef, useState } from 'react';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

type StoryCardProps = {
  item: RankedItem;
  onOpen: (item: RankedItem) => void;
  slateLabel?: string;
  traceId?: string;
  index?: number;
};

export function StoryCard({ item, onOpen, slateLabel = 'feed_primary', traceId, index = 0 }: StoryCardProps) {
  const date = new Date(item.startTime);
  const [hasLogged, setHasLogged] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = ref.current;
    if (!target || hasLogged) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            logClientEvent('card_view', { screen: 'feed', traceId, slateLabel, eventId: item.id, position: index });
            setHasLogged(true);
          }
        });
      },
      { threshold: 0.6 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [item.id, hasLogged, slateLabel, traceId, index]);
  return (
    <article ref={ref} className="flex flex-col rounded-[36px] border border-white/10 bg-gradient-to-b from-white/10 via-transparent to-black/30 p-4 text-white shadow-[0_15px_80px_rgba(2,0,19,0.6)]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] bg-black/40">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-white/50">CityLens</div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
          <span className="rounded-full bg-white/10 px-3 py-1">{item.neighborhood ?? item.category ?? 'City'}</span>
          {item.socialPreview?.platform && (
            <span className="rounded-full bg-black/60 px-3 py-1">{item.socialPreview.platform}</span>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.5em] text-white/50">{item.neighborhood ?? item.category ?? 'CityLens'}</p>
        <h3 className="text-2xl font-semibold leading-tight">{item.title}</h3>
        <p className="text-sm text-white/60">
          {date.toLocaleDateString([], { weekday: 'short' })} · {date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
        <ReasonChips
          reasons={item.reasons}
          onHide={() => logClientEvent('hide', { screen: 'feed', traceId, slateLabel, eventId: item.id, position: index })}
        />
        <div className="mt-auto space-y-2">
          {item.bookingUrl && (
            <a
              href={item.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="block rounded-full border border-white/20 px-4 py-2 text-center text-sm text-white/80 transition hover:border-white/40"
              onClick={() => logClientEvent('click_book', { screen: 'feed', traceId, slateLabel, eventId: item.id, position: index, viewType: 'open_event' })}
            >
              Open event page
            </a>
          )}
          <div className="flex gap-3">
            <button
              className="flex-1 rounded-full bg-white text-black py-3 text-sm font-semibold"
              onClick={() => {
                logClientEvent('card_view', { screen: 'feed', traceId, slateLabel, eventId: item.id, position: index, viewType: 'modal' });
                onOpen(item);
              }}
            >
              Context
            </button>
            <a
              href={`/feed?ids=${item.id}`}
              className="rounded-full border border-white/30 px-4 py-3 text-sm text-white/70"
              onClick={() => logClientEvent('save', { screen: 'feed', traceId, slateLabel, eventId: item.id, position: index })}
            >
              Save
            </a>
          </div>
          <div className="flex gap-3 text-xs">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.venueName || item.title)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-full border border-white/20 px-4 py-2 text-white/80"
              onClick={() => logClientEvent('click_route', { screen: 'feed', traceId, slateLabel, eventId: item.id, position: index })}
            >
              Route
            </a>
            {item.bookingUrl && (
              <a
                href={item.bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 rounded-full border border-white/20 px-4 py-2 text-white/80"
                onClick={() => logClientEvent('click_book', { screen: 'feed', traceId, slateLabel, eventId: item.id, position: index })}
              >
                Book
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
