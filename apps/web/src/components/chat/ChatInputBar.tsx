'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, SendHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

type ChatInputBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
};

const EXAMPLE_PROMPTS = [
  'A late-morning yoga class near Chelsea',
  'Somewhere quiet to work this afternoon in Soho',
  'An evening where we can walk, eat, and talk in Brooklyn',
  'A fun workout after work near Hudson Yards',
];

export function ChatInputBar({ value, onChange, onSubmit, disabled }: ChatInputBarProps) {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const placeholder = useMemo(() => EXAMPLE_PROMPTS[0], []);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
  }, [value]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) {
      onSubmit();
    }
  };

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-white/5 bg-gradient-to-b from-transparent via-[#050509]/60 to-[#050509] pb-2 pt-4">
      <p className="text-xs text-white/60">Examples · CityLens works for mornings, afternoons, and nights</p>
      <div className="mt-2 flex flex-wrap gap-2 text-left text-xs">
        {EXAMPLE_PROMPTS.map((example) => (
          <button
            key={example}
            type="button"
            className="rounded-full border border-white/15 px-3 py-1 text-white/70 transition hover:border-white/40"
            onClick={() => onChange(example)}
          >
            {example}
          </button>
        ))}
      </div>
      <form
        onSubmit={handleSubmit}
        className={cn(
          'mt-4 flex w-full items-end gap-3 rounded-[26px] border border-white/10 bg-[#070b13]/90 px-4 py-3 shadow-[0_20px_60px_rgba(5,5,12,0.55)]',
          focused && 'border-white/30'
        )}
      >
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70"
          aria-label="Voice input (coming soon)"
        >
          <Mic size={18} />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="max-h-36 flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          rows={1}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          disabled={disabled}
        />
        <button
          type="submit"
          disabled={!canSend}
          className={cn(
            'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition',
            canSend ? 'bg-white text-[#050509]' : 'bg-white/10 text-white/40'
          )}
        >
          Ask CityLens
          <SendHorizontal className="ml-2 h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
