import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChatShellProps = {
  children: ReactNode;
};

export function ChatShell({ children }: ChatShellProps) {
  return (
    <div
      className={cn(
        'min-h-screen w-full bg-gradient-to-b from-[#050509] via-[#070914] to-[#0A0F18] text-white',
        'px-4 py-6 pb-24 md:px-8'
      )}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-6">{children}</div>
    </div>
  );
}
