import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
};

type ChatMessageListProps = {
  messages: ChatMessage[];
  tail?: ReactNode;
  isStreaming?: boolean;
};

export function ChatMessageList({ messages, tail, isStreaming }: ChatMessageListProps) {
  if (!messages.length) {
    return (
      <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 text-white/70">
        <p className="text-sm text-white/80">Ask for a vibe to start.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <article
          key={message.id}
          className={cn(
            'rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm leading-relaxed',
            message.role === 'assistant' ? 'text-white/80' : 'text-white',
            message.meta && 'space-y-2'
          )}
        >
          <p className="uppercase tracking-[0.4em] text-[10px] text-white/40">{message.role === 'assistant' ? 'CityLens' : 'You'}</p>
          <p className="text-base text-white/90">{message.text || (isStreaming && '…')}</p>
          {message.meta && <p className="text-xs text-white/50">{message.meta}</p>}
        </article>
      ))}
      {tail}
    </div>
  );
}
