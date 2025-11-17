import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div
      className={cn(
        'relative min-h-screen bg-gradient-to-b from-black via-[#05030b] to-[#090717] px-4 py-10 text-white md:px-8',
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(77,123,255,0.15),_transparent_50%)]" />
      <div className="relative mx-auto max-w-6xl">{children}</div>
    </div>
  );
}
