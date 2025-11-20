'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChatContentProps = {
  children: ReactNode;
  className?: string;
};

export function ChatContent({ children, className }: ChatContentProps) {
  return (
    <div className={cn('flex-1 min-h-0 overflow-y-auto space-y-6 px-2 pb-32 pt-2', className)}>
      {children}
    </div>
  );
}
