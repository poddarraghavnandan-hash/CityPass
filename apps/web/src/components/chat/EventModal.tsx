'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { RankedItem } from '@citypass/types';
import { Chip } from '@/components/ui/Chip';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

type EventModalProps = {
  item: RankedItem | null;
  onClose: () => void;
  traceId?: string;
  slateLabel?: string;
  position?: number;
};

export function EventModal({ item, onClose, traceId, slateLabel = 'chat', position = 0 }: EventModalProps) {
  if (!item) return null;

  const schedule = item.startTime ? formatTimeRange(item.startTime, item.endTime) : null;
  const area = item.neighborhood || item.city;
  const vibeReasons = item.reasons?.slice(0, 3) ?? [];
  const priceLabel = getPriceLabel(item);
  const distanceLabel = getDistanceLabel(item.distanceKm);
  const moodLabel = getMoodLabel(item.category);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.venueName || item.title)}`;

  const closeModal = () => onClose();

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
          onClick={closeModal}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[#050a11]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-sm text-white/70 hover:text-white"
              onClick={closeModal}
            >
              Close
            </button>
            <div className="h-64 w-full overflow-hidden">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#111629] via-[#0B0F1C] to-[#050509] text-white/40">
                  CityLens
                </div>
              )}
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {schedule && (
                    <Chip asChild variant="soft" size="sm">
                      <span>{schedule}</span>
                    </Chip>
                  )}
                  <Chip asChild variant="soft" size="sm">
                    <span>{area}</span>
                  </Chip>
                </div>
                <h2 className="text-3xl font-semibold text-white">{item.title}</h2>
                {item.venueName && <p className="text-sm text-white/60">{item.venueName}</p>}
                {item.description && <p className="text-sm text-white/70">{item.description}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Chip asChild variant="outline" size="sm">
                  <span>{priceLabel}</span>
                </Chip>
                <Chip asChild variant="outline" size="sm">
                  <span>{distanceLabel}</span>
                </Chip>
                <Chip asChild variant="soft" size="sm">
                  <span>{moodLabel}</span>
                </Chip>
              </div>
              {vibeReasons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-white">Why this</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-white/70">
                    {vibeReasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid gap-3 text-sm font-semibold text-white sm:grid-cols-3">
                <button
                  type="button"
                  className="rounded-2xl border border-white/15 bg-white/[0.06] py-3 text-white hover:bg-white/[0.12]"
                  onClick={() => {
                    logClientEvent('save', { screen: 'chat', traceId, slateLabel, eventId: item.id, position });
                    closeModal();
                  }}
                >
                  Save
                </button>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/15 bg-white text-center text-[#050509] hover:bg-white/90"
                  onClick={() => logClientEvent('click_route', { screen: 'chat', traceId, slateLabel, eventId: item.id, position })}
                >
                  Get directions
                </a>
                {item.bookingUrl ? (
                  <a
                    href={item.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/15 bg-gradient-to-r from-teal-400 to-cyan-300 text-center text-[#050509]"
                    onClick={() =>
                      logClientEvent('click_book', { screen: 'chat', traceId, slateLabel, eventId: item.id, position, viewType: 'open_event' })
                    }
                  >
                    Open tickets
                  </a>
                ) : (
                  <button
                    type="button"
                    className="rounded-2xl border border-white/15 bg-white/[0.03] py-3 text-white/40"
                    disabled
                  >
                    Open tickets
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start) return null;
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  const startLabel = `${startDate.toLocaleDateString(undefined, { weekday: 'short' })} · ${startDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
  if (!endDate) return startLabel;
  return `${startLabel} — ${endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
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
