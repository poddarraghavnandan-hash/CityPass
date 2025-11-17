import { useEffect } from 'react';
import type { RankedItem } from '@citypass/types';
import { ReasonChips } from '@/components/chat/ReasonChips';

type ContextModalProps = {
  item: RankedItem | null;
  onClose: () => void;
};

export function ContextModal({ item, onClose }: ContextModalProps) {
  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-8">
      <div className="relative max-h-full w-full max-w-3xl overflow-y-auto rounded-[40px] border border-white/10 bg-[#05030b] p-8 text-white">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full border border-white/20 px-3 py-1 text-sm text-white/70"
          aria-label="Close modal"
        >
          Close
        </button>
        <div className="aspect-video overflow-hidden rounded-[28px] bg-black/40">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-white/60">No media</div>
          )}
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.5em] text-white/40">{item.neighborhood ?? item.city}</p>
            <h3 className="text-3xl font-semibold">{item.title}</h3>
            <p className="text-sm text-white/70">{item.description}</p>
          </div>
          <ReasonChips reasons={item.reasons} />
          {item.socialPreview?.embedHtml && (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="mb-2 text-xs uppercase tracking-[0.4em] text-white/40">Highlight</p>
              <div dangerouslySetInnerHTML={{ __html: item.socialPreview.embedHtml }} />
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-sm text-white/70">
            {item.bookingUrl && (
              <a href={item.bookingUrl} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-5 py-2 text-white">
                Book / RSVP
              </a>
            )}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.venueName || item.title)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 px-5 py-2 text-white"
            >
              Open map
            </a>
            <a href={`/feed?ids=${item.id}`} className="rounded-full border border-white/20 px-5 py-2 text-white">
              Open in feed
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
