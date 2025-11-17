import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';

type ErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  action?: ReactNode;
};

export function ErrorState({
  title = 'We hit turbulence',
  description = 'The signal dropped for a moment. Try again or jump into the feed.',
  onRetry,
  action,
}: ErrorStateProps) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-8 text-center text-white">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-3xl">
        ☄️
      </div>
      <h3 className="text-2xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-white/70">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button onClick={onRetry} className="rounded-full bg-white/10 text-white hover:bg-white/20">
            Try again
          </Button>
        )}
        {action}
        <Button asChild variant="ghost" className="text-white/70 hover:text-white">
          <a href="/feed">Open Feed</a>
        </Button>
      </div>
    </div>
  );
}
