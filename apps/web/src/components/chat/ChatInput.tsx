'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MicOrb } from './MicOrb';

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onMicResult: (value: string) => void;
  onMicError: (error: Error) => void;
  disabled?: boolean;
  inline?: boolean;
};

export function ChatInput({ value, onChange, onSubmit, onMicResult, onMicError, disabled, inline }: ChatInputProps) {
  const [focused, setFocused] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  const form = (
    <form
      onSubmit={handleSubmit}
      className={`flex flex-col gap-4 rounded-[30px] border border-white/10 bg-white/5 p-4 md:flex-row md:items-center ${
        inline ? '' : 'shadow-[0_20px_80px_rgba(0,0,0,0.5)]'
      } transition-all duration-200 ${focused ? 'border-white/30 bg-white/10' : ''}`}
    >
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tell me the vibe..."
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full flex-1 resize-none rounded-2xl border border-white/10 bg-black/40 px-4 py-4 text-base text-white placeholder:text-white/40 focus:border-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 md:min-h-[72px]"
        disabled={disabled}
      />
      <div className="flex items-center justify-between gap-4 md:w-auto">
        <MicOrb onTranscript={onMicResult} onError={onMicError} />
        <Button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-full bg-white text-black hover:bg-white/90 disabled:bg-white/30 disabled:text-white/60"
        >
          Send
        </Button>
      </div>
    </form>
  );

  if (inline) return form;

  return <div className="sticky bottom-4 z-10">{form}</div>;
}
