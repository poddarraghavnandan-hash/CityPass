'use client';

import { motion } from 'framer-motion';
import type { RankedItem } from '@citypass/types';
import { Chip } from '@/components/ui/Chip';
import { logClientEvent } from '@/lib/analytics/logClientEvent';
import { cn } from '@/lib/utils';

type StoryCardProps = {
  item: RankedItem;
  onOpen: (item: RankedItem) => void;
  traceId?: string;
  slateLabel?: string;
  index?: number;
};

export function StoryCard({ item, onOpen, traceId, slateLabel = 'chat', index = 0 }: StoryCardProps) {
  const startTime = item.startTime ? new Date(item.startTime) : null;
  const timeLabel = startTime ? formatTimeLabel(startTime) : 'Anytime';
  const areaLabel = item.neighborhood || item.city;
  const vibeLine = cleanReason(item.reasons?.[0]);
  const priceLabel = getPriceLabel(item);
  const distanceLabel = getDistanceLabel(item.distanceKm);
  const moodLabel = getMoodLabel(item.category);

  const handleOpen = () => {
    logClientEvent('card_view', { screen: 'chat', slateLabel, traceId, eventId: item.id, position: index, viewType: 'open_modal' });
    onOpen(item);
  };

  return (
    <motion.article
      layout
      whileHover={{ y: -4 }}
      className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] shadow-[0_25px_70px_rgba(5,5,12,0.55)]"
      onClick={handleOpen}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#111629] via-[#0B0F1C] to-[#050509] text-sm font-semibold text-white/40">
            CityLens
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-white/80">
          <span className="rounded-full bg-black/60 px-3 py-1">{areaLabel}</span>
          <span className="rounded-full bg-white/20 px-3 py-1 text-black">{timeLabel.split('·')[0]}</span>
        </div>
      </div>
      <div className="space-y-3 px-4 pb-4 pt-5">
        <p className="text-xs text-white/60">{timeLabel}</p>
        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
        <p className="text-sm text-white/70">{vibeLine}</p>
        <div className="flex flex-wrap gap-2">
          <Chip asChild variant="outline" size="sm">
            <span>{priceLabel}</span>
          </Chip>
          <Chip asChild variant="outline" size="sm">
            <span>{distanceLabel}</span>
          </Chip>
          <Chip asChild variant="soft" size="sm" className="bg-white/10">
            <span className="text-white/80">{moodLabel}</span>
          </Chip>
        </div>
        <button
          type="button"
          className={cn(
            'w-full rounded-2xl border border-white/10 bg-white text-sm font-semibold text-[#050509] transition hover:bg-white/90'
          )}
          onClick={(event) => {
            event.stopPropagation();
            handleOpen();
          }}
        >
          View details
        </button>
      </div>
    </motion.article>
  );
}

function formatTimeLabel(date: Date) {
  const today = new Date();
  const diff = differenceInDays(date, today);
  const dayLabel = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : date.toLocaleDateString(undefined, { weekday: 'long' });
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${dayLabel} · ${time}`;
}

function differenceInDays(a: Date, b: Date) {
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((startA.getTime() - startB.getTime()) / (1000 * 60 * 60 * 24));
}

function cleanReason(reason?: string) {
  if (!reason) return 'Picked because it fits how you like to spend your time.';
  const trimmed = reason.replace(/^[•\-–\s]+/, '').trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

function getPriceLabel(item: RankedItem) {
  const maxPrice = item.priceMax ?? item.priceMin ?? 0;
  if (!maxPrice) return 'Free';
  if (maxPrice <= 30) return '$';
  if (maxPrice <= 75) return '$$';
  if (maxPrice <= 150) return '$$$';
  return '$$$$';
}

function getDistanceLabel(distanceKm?: number | null) {
  if (distanceKm == null) return 'Nearby';
  const miles = distanceKm * 0.621371;
  if (miles < 0.5) return 'Walkable';
  return `${miles.toFixed(1)} mi away`;
}

function getMoodLabel(category?: string | null) {
  if (!category) return 'Flexible vibe';
  return category
    .toLowerCase()
    .split(/[\s_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
