import Link from 'next/link';
import type { Intention, RankedItem } from '@citypass/types';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { MapPin, Clock, ExternalLink, Calendar, Star } from 'lucide-react';

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
    <section className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.key
              ? 'bg-white text-black shadow-lg shadow-white/10'
              : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4">
        {items.map((item, index) => (
          <motion.article
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-card/50 p-1 transition-all hover:border-white/20"
          >
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/5">
                  <MapPin className="h-8 w-8 text-white/20" />
                </div>
              )}

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Floating Badges */}
              <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
                {item.reasons?.slice(0, 1).map((reason) => (
                  <span key={reason} className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
                    <Star size={10} className="fill-white text-white" />
                    {reason}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3">
              <header className="mb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate group-hover:text-white/90">{item.title}</h3>
                    <p className="text-xs text-white/60 truncate">
                      {item.venueName ?? 'City venue'}
                    </p>
                  </div>
                  {item.fitScore && (
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="text-lg font-bold text-white">{Math.round(item.fitScore * 100)}%</span>
                      <span className="text-[9px] uppercase tracking-wider text-white/40">Match</span>
                    </div>
                  )}
                </div>
              </header>

              <div className="flex items-center gap-3 text-[11px] text-white/50 mb-3">
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(item.startTime).toLocaleString([], { hour: 'numeric', minute: '2-digit', weekday: 'short' })}
                </div>
                {item.distanceKm && (
                  <div className="flex items-center gap-1">
                    <MapPin size={12} />
                    {item.distanceKm.toFixed(1)}km
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1 rounded-lg bg-white text-black hover:bg-white/90 h-8 text-xs" asChild>
                  <a href={item.bookingUrl ?? '#'} target="_blank" rel="noreferrer">
                    Book
                  </a>
                </Button>
                <Button variant="outline" className="flex-1 rounded-lg border-white/10 bg-transparent hover:bg-white/5 h-8 text-xs" asChild>
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
                    Details
                  </Link>
                </Button>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
