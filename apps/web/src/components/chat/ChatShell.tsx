import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChatShellProps = {
  children: ReactNode;
};

export function ChatShell({ children }: ChatShellProps) {
  return (
    <div className="flex h-full min-h-full flex-col px-4 py-4 sm:px-6">
      <div
        className={cn(
          'relative mx-auto flex h-full max-w-3xl flex-1 min-h-0 flex-col gap-4 overflow-hidden rounded-[32px] border border-white/10 bg-[#0D101A]/90 text-white',
          'shadow-[0_25px_80px_rgba(5,5,12,0.55)] backdrop-blur'
        )}
      >
        {children}
      </div>
    </div>
  );
}
