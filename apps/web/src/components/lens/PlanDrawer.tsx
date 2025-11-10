'use client';

import { useMemo } from 'react';
import type { RankedItem } from '@citypass/types';

type SlateKey = 'best' | 'wildcard' | 'closeAndEasy';

interface PlanDrawerProps {
  slates?: Partial<Record<SlateKey, RankedItem[]>> | null;
  fallback?: RankedItem[];
  dense?: boolean;
}

const TABS: Array<{ id: SlateKey; label: string; description: string }> = [
  { id: 'best', label: 'Best Fit', description: 'Most aligned with your intention' },
  { id: 'wildcard', label: 'Wildcard', description: 'Stretch your vibe' },
  { id: 'closeAndEasy', label: 'Close & Easy', description: 'Under 3km, chill commute' },
];

export function PlanDrawer({ slates, fallback = [], dense = false }: PlanDrawerProps) {
  const listings = useMemo(() => {
    if (slates && (slates.best?.length || slates.wildcard?.length || slates.closeAndEasy?.length)) {
      return {
        best: slates.best?.[0],
        wildcard: slates.wildcard?.[0] ?? slates.best?.[1],
        closeAndEasy: slates.closeAndEasy?.[0] ?? slates.best?.[2],
      };
    }

    if (!fallback.length) {
      return null;
    }

    return {
      best: fallback[0],
      wildcard: fallback[1] || fallback[0],
      closeAndEasy: fallback[2] || fallback[0],
    };
  }, [slates, fallback]);

  if (!listings) {
    return null;
  }

  return (
    <section className={`plan-drawer ${dense ? 'plan-drawer--dense' : ''}`} aria-label="Plan ideas">
      {TABS.map((tab) => {
        const event = listings[tab.id];
        if (!event) return null;

        return (
          <article key={tab.id} className="plan-card">
            <header>
              <p className="plan-label">{tab.label}</p>
              <h3 className="plan-title">{event.title}</h3>
              <p className="plan-desc">{tab.description}</p>
            </header>
            <footer className="plan-footer">
              <span>{new Date(event.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              <a href={event.bookingUrl || '#'} target="_blank" rel="noreferrer" className="plan-link">
                Details →
              </a>
            </footer>
          </article>
        );
      })}
    </section>
  );
}
