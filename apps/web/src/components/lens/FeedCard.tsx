'use client';

import { useEffect, useRef } from 'react';
import type { RankedItem } from '@citypass/types/lens';
import type { MoodKey } from '@/theme/lensTheme';
import { HeatBar } from './HeatBar';
import { PatronBadge } from './PatronBadge';

interface FeedCardProps {
  item: RankedItem;
  mood: MoodKey;
  isActive: boolean;
  onOpenContext: (item: RankedItem) => void;
  onSave: (id: string) => void;
  onImpression: (id: string) => void;
}

export function FeedCard({ item, mood, isActive, onOpenContext, onSave, onImpression }: FeedCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const target = cardRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onImpression(item.id);
          }
        });
      },
      { threshold: 0.65 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [item.id, onImpression]);

  return (
    <article
      ref={cardRef}
      className={`lens-card transition-transform duration-500 mx-auto max-w-xl ${isActive ? 'lens-glow' : 'opacity-80'}`}
    >
      <div className="lens-card-media">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} loading="lazy" />
        ) : (
          <div className="flex items-center justify-center h-full text-white/40 text-sm">CityLens</div>
        )}
        {item.socialPreview && (
          <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full">
            {item.socialPreview.platform}
          </div>
        )}
      </div>
      <div className="p-5 space-y-4">
        <header className="flex justify-between items-start gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">{mood} mode</p>
            <h2 className="text-2xl font-semibold">{item.title}</h2>
            {item.venueName && (
              <p className="text-white/60 text-sm">
                {item.venueName} · {new Date(item.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
          </div>
          {item.sponsored && (
            <PatronBadge
              label={item.patronLabel || 'Patron'}
              disclosure={item.adDisclosure || 'Paid placement that still fits your vibe.'}
              onWhy={(message) => {
                if (typeof window !== 'undefined') {
                  window.alert(message);
                }
              }}
            />
          )}
        </header>

        {item.description && <p className="text-white/70 text-sm leading-relaxed line-clamp-4">{item.description}</p>}

        <HeatBar value={item.socialHeat ?? 0.4} />

        <div className="flex flex-wrap gap-2">
          {item.reasons.slice(0, 3).map((reason) => (
            <span key={reason} className="lens-token text-xs">
              {reason}
            </span>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-full bg-white text-black font-semibold py-3"
            onClick={() => onOpenContext(item)}
          >
            Expand
          </button>
          <button
            className="rounded-full border border-white/30 px-4 text-white"
            onClick={() => onSave(item.id)}
            aria-label="Save"
          >
            ♥
          </button>
        </div>
      </div>
    </article>
  );
}
