'use client';

interface PatronBadgeProps {
  label?: string;
  disclosure?: string;
  onWhy?: (message: string) => void;
}

export function PatronBadge({ label = 'Patron pick', disclosure = 'Partner spotlight', onWhy }: PatronBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-white/80">
      <span className="px-2 py-1 rounded-full bg-white/15 border border-white/20 uppercase tracking-[0.25em]">
        {label}
      </span>
      <button
        onClick={() => onWhy?.(disclosure)}
        className="underline underline-offset-4 text-white/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-sm"
      >
        Why this ad?
      </button>
    </div>
  );
}
