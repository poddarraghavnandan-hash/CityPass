'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function PageShell({ children, className, contentClassName }: PageShellProps) {
  return (
    <div className={cn('flex h-full min-h-full flex-col px-4 py-4 text-white sm:px-6', className)}>
      <div
        className={cn(
          'mx-auto flex h-full w-full max-w-5xl flex-1 min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0D101A]/90 p-4 shadow-[0_25px_80px_rgba(5,5,12,0.55)]',
          contentClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
