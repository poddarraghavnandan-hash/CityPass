'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ReasonChips } from '@/components/chat/ReasonChips';
import type { RankedItem } from '@citypass/types';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

type EventModalProps = {
  item: RankedItem | null;
  onClose: () => void;
  traceId?: string;
  slateLabel?: string;
  position?: number;
};

export function EventModal({ item, onClose, traceId, slateLabel = 'chat', position = 0 }: EventModalProps) {
  const handleShare = () => {
    if (!item) return;
    const url = item.bookingUrl || (item as any).sourceUrl || window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: item.title, url }).catch(() => null);
    } else {
      window.open(url, '_blank', 'noreferrer');
    }
    logClientEvent('share', { screen: 'chat', traceId, slateLabel, eventId: item.id, position });
  };

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative h-[80vh] w-full max-w-3xl overflow-hidden rounded-[36px] border border-white/10 bg-gradient-to-b from-[#0b0f1f] to-black text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-full border border-white/20 px-3 py-1 text-sm text-white/70 hover:text-white"
              onClick={onClose}
            >
              Close
            </button>
            <div className="relative h-72 w-full overflow-hidden">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center bg-black/40 text-white/50">CityLens</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            </div>
            <div className="space-y-4 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">{item.neighborhood ?? item.city}</p>
                <h3 className="text-3xl font-semibold">{item.title}</h3>
                <p className="text-sm text-white/70">{item.description}</p>
              </div>
              <ReasonChips reasons={item.reasons} />
              <div className="flex flex-wrap gap-3 text-sm text-white/80">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.venueName || item.title)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-4 py-2"
                  onClick={() => logClientEvent('click_route', { screen: 'chat', traceId, slateLabel, eventId: item.id, position })}
                >
                  Route
                </a>
                {item.bookingUrl && (
                  <a
                    href={item.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/20 px-4 py-2"
                    onClick={() =>
                      logClientEvent('click_book', { screen: 'chat', traceId, slateLabel, eventId: item.id, position, viewType: 'open_event' })
                    }
                  >
                    Book
                  </a>
                )}
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-4 py-2 text-white/80"
                  onClick={() => logClientEvent('save', { screen: 'chat', traceId, slateLabel, eventId: item.id, position })}
                >
                  Save
                </button>
                <button type="button" className="rounded-full border border-white/20 px-4 py-2 text-white/80" onClick={handleShare}>
                  Share
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-4 py-2 text-white/80"
                  onClick={() => logClientEvent('hide', { screen: 'chat', traceId, slateLabel, eventId: item.id, position })}
                >
                  Not interested
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
