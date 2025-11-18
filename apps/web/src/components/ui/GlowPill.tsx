import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type GlowPillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function GlowPill({ children, className, ...props }: GlowPillProps) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/40 hover:text-white',
        'shadow-[0_0_24px_rgba(77,123,255,0.25)] backdrop-blur',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
