'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RankedItem, SocialPreview } from '@citypass/types/lens';
import { HeatBar } from './HeatBar';
import { PlanPanel } from './PlanPanel';
import { CirclePanel } from './CirclePanel';

interface ContextModalProps {
  item: RankedItem | null;
  companions: string[];
  onClose: () => void;
}

interface EmbedState {
  html?: string;
  posterUrl?: string;
  loading: boolean;
}

export function ContextModal({ item, companions, onClose }: ContextModalProps) {
  const [embed, setEmbed] = useState<EmbedState>({ loading: false });

  useEffect(() => {
    if (!item?.socialPreview) {
      setEmbed({ loading: false });
      return;
    }

    const preview = item.socialPreview;
    const controller = new AbortController();
    setEmbed({ loading: true });

    fetch(`/api/social/oembed?platform=${preview.platform}&url=${encodeURIComponent(preview.url)}`, {
      signal: controller.signal,
    })
      .then(res => res.json())
      .then(payload => {
        setEmbed({
          html: payload?.data?.embedHtml,
          posterUrl: payload?.data?.posterUrl ?? preview.posterUrl,
          loading: false,
        });
      })
      .catch(() => {
        setEmbed({
          html: undefined,
          posterUrl: preview.posterUrl,
          loading: false,
        });
      });

    return () => controller.abort();
  }, [item?.socialPreview]);

  useEffect(() => {
    if (!item) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [item, onClose]);

  if (!item) return null;

  const start = new Date(item.startTime);
  const end = item.endTime ? new Date(item.endTime) : null;
  const dateLabel = start.toLocaleString(undefined, {
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
  });

  const socialPreview = item.socialPreview;
  const embedBody = buildEmbed(embed, socialPreview);

  return (
    <div className="lens-context-backdrop" role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="lens-context-panel p-6 md:p-8 space-y-6 overflow-y-auto">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-white/60">{dateLabel}</p>
            <h2 className="text-3xl font-semibold">{item.title}</h2>
            {item.venueName && <p className="text-white/70 text-sm">{item.venueName}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded-full px-3 py-1"
            aria-label="Close detail"
          >
            ✕
          </button>
        </header>

        {embedBody}

        <section className="grid md:grid-cols-2 gap-5">
          <HeatBar value={item.socialHeat ?? 0.4} />
          <PlanPanel item={item} />
        </section>

        <CirclePanel companions={companions} />

        <section>
          <h3 className="text-lg font-semibold mb-2">Why this?</h3>
          {item.sponsored && item.adDisclosure && (
            <p className="text-sm text-white/60 mb-2">{item.adDisclosure}</p>
          )}
          <ul className="space-y-2 text-white/80">
            {Array.from(new Set(item.reasons)).map(reason => (
              <li key={reason} className="flex items-start gap-2">
                <span aria-hidden="true">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function buildEmbed(embed: EmbedState, preview?: SocialPreview | null) {
  if (embed.loading) {
    return <div className="lens-card-media animate-pulse rounded-3xl" aria-busy="true" />;
  }

  if (embed.html) {
    return (
      <div
        className="citylens-embed"
        dangerouslySetInnerHTML={{ __html: embed.html }}
      />
    );
  }

  if (preview?.posterUrl) {
    return (
      <div className="lens-card-media rounded-3xl">
        <img src={preview.posterUrl} alt={preview.caption || 'Social preview'} />
      </div>
    );
  }

  return null;
}
