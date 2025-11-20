'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ProfileShellProps = {
  children: ReactNode;
  status: 'idle' | 'loading' | 'saving' | 'saved' | 'error';
  onSave: () => void;
  error?: string | null;
};

export function ProfileShell({ children, status, onSave, error }: ProfileShellProps) {
  const saving = status === 'saving' || status === 'loading';
  return (
    <section className="flex h-full min-h-0 flex-col text-white">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-white/50">Taste profile</p>
        <h1 className="text-2xl font-semibold">How you like to spend your time</h1>
        <p className="text-sm text-white/70">Adjust these signals and CityLens learns where to look first.</p>
      </header>
      <div className="mt-4 flex-1 min-h-0 overflow-y-auto">{children}</div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className={cn(
            'inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-[#050509] transition',
            saving && 'opacity-60'
          )}
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
        {status === 'saved' && <span className="text-xs text-teal-200">Preferences updated</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </section>
  );
}
