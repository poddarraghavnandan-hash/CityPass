import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type GlowBadgeProps = {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'outline';
};

export function GlowBadge({ children, className, variant = 'default' }: GlowBadgeProps) {
  if (variant === 'outline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-white/30 px-4 py-1 text-xs uppercase tracking-[0.3em] text-white/70',
          className
        )}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600/60 via-indigo-500/60 to-pink-500/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white shadow-[0_0_30px_rgba(77,123,255,0.5)]',
        className
      )}
    >
      {children}
    </span>
  );
}
