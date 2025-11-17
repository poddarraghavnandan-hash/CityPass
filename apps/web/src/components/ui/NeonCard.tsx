import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type NeonCardProps = {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
};

export function NeonCard({ children, className, interactive = false }: NeonCardProps) {
  return (
    <div
      className={cn(
        'card-outline relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-6 text-white shadow-[0_20px_80px_rgba(5,0,20,0.7)]',
        interactive && 'transition hover:border-white/30 hover:shadow-[0_15px_60px_rgba(77,123,255,0.45)]',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 blur-3xl" />
      {children}
    </div>
  );
}
