import Link from 'next/link';
import type { Intention, RankedItem } from '@citypass/types';
import { ReasonChips } from './ReasonChips';
import { Button } from '@/components/ui/button';
import { GlowBadge } from '@/components/ui/GlowBadge';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

const tabLabels = {
  best: 'Best',
  wildcard: 'Wildcard',
  closeAndEasy: 'Close & Easy',
} as const;

type SlateKey = keyof typeof tabLabels;

type SlateTabsProps = {
  slates: Partial<Record<SlateKey, RankedItem[]>> | null;
  activeTab: SlateKey;
  onTabChange: (tab: SlateKey) => void;
  intention?: Intention | null;
  traceId?: string;
};

export function SlateTabs({ slates, activeTab, onTabChange, intention, traceId }: SlateTabsProps) {
  if (!slates) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-white/70">
        <p>Slates appear after you describe a vibe in chat.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-white">
      <div className="flex flex-wrap gap-3">
        {(Object.keys(tabLabels) as SlateKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onTabChange(key)}
            className={`rounded-full px-4 py-1 text-sm transition ${
              activeTab === key ? 'bg-white text-black' : 'bg-white/10 text-white/60 hover:text-white'
            }`}
          >
            {tabLabels[key]}
          </button>
        ))}
      </div>
      {intention && (
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-white/40">
          {intention.tokens.mood} · {intention.city}
        </p>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {slates[activeTab]?.map((item) => (
          <SlateCard key={item.id} item={item} slateLabel={activeTab} traceId={traceId} intention={intention} />
        )) || <p className="text-white/70">No matches for this tab.</p>}
      </div>
    </div>
  );
}

type SlateCardProps = {
  item: RankedItem;
  slateLabel: SlateKey;
  traceId?: string;
  intention?: Intention | null;
};

function SlateCard({ item, slateLabel, traceId, intention }: SlateCardProps) {
  const eventTime = new Date(item.startTime);
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${eventTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    item.endTime ? `DTEND:${item.endTime.replace(/[-:]/g, '').split('.')[0]}Z` : '',
    `SUMMARY:${item.title}`,
    item.venueName ? `LOCATION:${item.venueName}` : '',
    `DESCRIPTION:${item.description ?? 'CityLens recommendation'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\n');

  const mapUrl = item.venueName
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.venueName + ' ' + (item.city || ''))}`
    : undefined;

  return (
    <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-transparent to-black/20 p-4">
      <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-black/40">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-white/40">CityLens preview</div>
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
        <GlowBadge variant="outline">{item.category ?? 'slate'}</GlowBadge>
        <div>
          <h3 className="text-xl font-semibold">{item.title}</h3>
          <p className="text-sm text-white/60">{eventTime.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}</p>
        </div>
        <ReasonChips
          reasons={item.reasons}
          onHide={() => logClientEvent('hide', { screen: 'chat', traceId, slateLabel, eventId: item.id })}
        />
        <div className="mt-auto flex flex-col gap-2 text-sm text-white/70">
          {mapUrl && (
            <Button asChild className="rounded-full bg-white text-black hover:bg-white/90" onClick={() => logClientEvent('click_route', { screen: 'chat', traceId, slateLabel, eventId: item.id })}>
              <a href={mapUrl} target="_blank" rel="noreferrer">
                Route
              </a>
            </Button>
          )}
          {item.bookingUrl && (
            <Button asChild variant="ghost" className="rounded-full border border-white/30 text-white hover:bg-white/10" onClick={() => logClientEvent('click_book', { screen: 'chat', traceId, slateLabel, eventId: item.id })}>
              <a href={item.bookingUrl} target="_blank" rel="noreferrer">
                Save / Book
              </a>
            </Button>
          )}
          <Button asChild variant="ghost" className="rounded-full border border-white/20 text-white hover:bg-white/10" onClick={() => logClientEvent('save', { screen: 'chat', traceId, slateLabel, eventId: item.id })}>
            <a href={`data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`} download={`${item.title}.ics`}>
              Add to calendar
            </a>
          </Button>
          <Button asChild variant="ghost" className="rounded-full border border-white/20 text-white hover:bg-white/10" onClick={() => logClientEvent('card_view', { screen: 'chat', traceId, slateLabel, eventId: item.id, viewType: 'open_in_feed' })}>
            <Link href={`/feed?ids=${item.id}`}>Open in Feed</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
