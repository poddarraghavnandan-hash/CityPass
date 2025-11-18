'use client';

import { FormEvent, useState } from 'react';
import { SendHorizontal, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatInputBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

export function ChatInputBar({ value, onChange, onSubmit, disabled }: ChatInputBarProps) {
  const [focused, setFocused] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="sticky bottom-0 left-0 right-0 z-20 bg-gradient-to-b from-transparent via-[#050509]/60 to-[#050509] pb-[env(safe-area-inset-bottom)] pt-3">
      <form
        onSubmit={handleSubmit}
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur',
          focused && 'border-white/30 bg-white/10'
        )}
      >
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white shadow-[0_0_40px_rgba(77,123,255,0.4)]"
          aria-label="Voice"
        >
          <Mic size={18} />
        </button>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe the vibe..."
          className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
          rows={1}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!canSend}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white transition',
            canSend ? 'bg-white text-black hover:bg-white/90' : 'bg-white/10 text-white/50'
          )}
          aria-label="Send"
        >
          <SendHorizontal size={18} />
        </button>
      </form>
    </div>
  );
}
