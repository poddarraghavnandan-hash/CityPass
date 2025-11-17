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
        {item.socialPreview?.platform && (
          <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs uppercase tracking-[0.3em]">
            {item.socialPreview.platform}
          </span>
        )}
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
        <div className="mt-auto flex gap-3">
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
      </div>
    </article>
  );
}
