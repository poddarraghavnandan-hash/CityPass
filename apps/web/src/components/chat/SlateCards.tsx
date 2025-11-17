import Link from 'next/link';
import type { Intention, RankedItem } from '@citypass/types';
import { Button } from '@/components/ui/button';

interface SlateCardsProps {
  slates: {
    best?: RankedItem[];
    wildcard?: RankedItem[];
    closeAndEasy?: RankedItem[];
  } | null;
  activeTab: 'best' | 'wildcard' | 'closeAndEasy';
  onTabChange: (tab: 'best' | 'wildcard' | 'closeAndEasy') => void;
  intention?: Intention | null;
}

const tabs: Array<{ key: 'best' | 'wildcard' | 'closeAndEasy'; label: string }> = [
  { key: 'best', label: 'Best Fit' },
  { key: 'wildcard', label: 'Wildcard' },
  { key: 'closeAndEasy', label: 'Close & Easy' },
];

export function SlateCards({ slates, activeTab, onTabChange, intention }: SlateCardsProps) {
  if (!slates) {
    return null;
  }

  const items = slates[activeTab] || [];

  return (
    <section className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`px-4 py-2 rounded-full text-sm border ${
              activeTab === tab.key ? 'bg-white text-black' : 'bg-white/10 text-white'
            }`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
            <header>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="text-white/70 text-sm">
                {item.venueName ?? 'City venue'} •{' '}
                {new Date(item.startTime).toLocaleString([], { hour: 'numeric', minute: '2-digit', weekday: 'short' })}
              </p>
            </header>
            {item.description && (
              <p className="text-white/80 text-sm line-clamp-3">{item.description}</p>
            )}
            {item.reasons?.length ? (
              <div className="flex flex-wrap gap-2">
                {item.reasons.slice(0, 3).map((reason) => (
                  <span key={reason} className="text-xs text-white/70 bg-white/10 px-3 py-1 rounded-full">
                    {reason}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" asChild>
                <a href={item.bookingUrl ?? '#'} target="_blank" rel="noreferrer">
                  Route
                </a>
              </Button>
              <Button variant="outline">Save</Button>
              <Button variant="ghost" asChild>
                <a href={`/api/plan?ics=${item.id}`} target="_blank" rel="noreferrer">
                  Add to Calendar
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <Link
                  href={{
                    pathname: '/feed',
                    query: {
                      ids: item.id,
                      city: intention?.city,
                      mood: intention?.tokens?.mood,
                      untilMinutes: intention?.tokens?.untilMinutes?.toString(),
                      distanceKm: intention?.tokens?.distanceKm?.toString(),
                      budget: intention?.tokens?.budget,
                      companions: intention?.tokens?.companions?.join(','),
                    },
                  }}
                >
                  Open in Feed
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
