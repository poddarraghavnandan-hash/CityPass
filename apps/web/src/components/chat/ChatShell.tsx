import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChatShellProps = {
  children: ReactNode;
};

export function ChatShell({ children }: ChatShellProps) {
  return (
    <div
      className={cn(
        'min-h-screen w-full overflow-hidden bg-gradient-to-b from-[#050509] via-[#070914] to-[#0A0F18] text-white',
        'flex flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+96px)] pt-[calc(env(safe-area-inset-top)+12px)] md:px-8'
      )}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">{children}</div>
    </div>
  );
}
