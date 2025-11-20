'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ChatBubble = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

type ChatMessagesProps = {
  messages: ChatBubble[];
};

export function ChatMessages({ messages }: ChatMessagesProps) {
  const reducedMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  if (!messages.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-white/70">
        Type anything you&apos;re in the mood for—morning workouts, focus time, dinner with friends—and CityLens will spin up actual plans.
      </div>
    );
  }

  const vizCount = expanded ? messages.length : Math.min(4, messages.length);
  const visible = messages.slice(-vizCount);
  const hasEarlier = !expanded && messages.length > vizCount;

  return (
    <div className="space-y-3">
      {hasEarlier && (
        <button
          type="button"
          className="text-xs font-medium text-white/60 underline-offset-4 hover:text-white hover:underline"
          onClick={() => setExpanded(true)}
        >
          Show earlier messages
        </button>
      )}
      {visible.map((message) => (
        <motion.div
          key={message.id}
          initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-[0_15px_45px_rgba(5,5,12,0.45)]',
            message.role === 'assistant'
              ? 'bg-white/[0.04] text-white backdrop-blur'
              : 'ml-auto bg-gradient-to-r from-teal-300 to-sky-400 text-slate-900'
          )}
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">
            {message.role === 'assistant' ? 'CityLens' : 'You'}
          </p>
          <p>{message.text}</p>
        </motion.div>
      ))}
    </div>
  );
}
