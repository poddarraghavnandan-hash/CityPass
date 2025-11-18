import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChatMainProps = {
  children: ReactNode;
};

export function ChatMain({ children }: ChatMainProps) {
  return (
    <div
      className={cn(
        'flex-1 min-h-0 overflow-y-auto',
        'space-y-6 px-1',
        'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10'
      )}
    >
      {children}
    </div>
  );
}
