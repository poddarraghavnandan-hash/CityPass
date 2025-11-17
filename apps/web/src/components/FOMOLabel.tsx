import { cn } from '@/lib/utils';

type FOMOType = 'limited_tickets' | 'selling_fast' | 'last_spots' | 'hot';

type FOMOLabelProps = {
  type: FOMOType;
  ticketsRemaining?: number;
  variant?: 'pill' | 'chip';
  className?: string;
};

const copy: Record<FOMOType, string> = {
  limited_tickets: 'Limited',
  selling_fast: 'Selling fast',
  last_spots: 'Last spots',
  hot: 'Hot',
};

export function FOMOLabel({ type, ticketsRemaining, variant = 'pill', className }: FOMOLabelProps) {
  const label = ticketsRemaining
    ? `${ticketsRemaining} left`
    : copy[type] || 'Hot';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]',
        variant === 'pill'
          ? 'rounded-full bg-gradient-to-r from-pink-600 to-blue-600 px-3 py-1 text-white shadow-[0_0_30px_rgba(77,123,255,0.6)]'
          : 'rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-white/80',
        className
      )}
    >
      <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]" aria-hidden="true" />
      {label}
    </span>
  );
}
