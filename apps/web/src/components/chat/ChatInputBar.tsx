'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="relative w-full">
      {/* Example Prompts - Fade out when typing */}
      <AnimatePresence>
        {!value && !focused && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 mb-4 w-full overflow-hidden"
          >
            <p className="mb-2 text-xs font-medium text-muted-foreground/60">Try asking about...</p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mask-fade-right">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                  onClick={() => onChange(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form
        onSubmit={handleSubmit}
        className={cn(
          'relative flex w-full items-end gap-2 rounded-[2rem] border bg-card/50 p-2 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-out',
          focused ? 'border-white/20 ring-1 ring-white/10' : 'border-white/10',
          'hover:border-white/20'
        )}
      >
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-white"
          aria-label="Voice input (coming soon)"
        >
          <Mic size={20} strokeWidth={1.5} />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={focused ? 'Ask anything...' : placeholder}
          className="max-h-36 flex-1 resize-none bg-transparent py-2.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
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
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300',
            canSend
              ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95'
              : 'bg-white/5 text-white/20'
          )}
        >
          <ArrowUp size={20} strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
