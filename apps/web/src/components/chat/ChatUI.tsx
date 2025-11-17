'use client';

import { useEffect, useRef, useState } from 'react';
import type { Intention, IntentionTokens, RankedItem } from '@citypass/types';
import { streamChat } from '@/lib/chat/streamClient';
import { ChatMessageList, type ChatMessage } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { SlateTabs } from './SlateTabs';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonStoryCard } from '@/components/feed/SkeletonStoryCard';
import { logClientEvent } from '@/lib/analytics/logClientEvent';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

interface ChatUIProps {
  city: string;
  defaultTokens: IntentionTokens;
  initialPrompt?: string;
}

type SlateKey = 'best' | 'wildcard' | 'closeAndEasy';

type SlateMap = Partial<Record<SlateKey, RankedItem[]>>;

export function ChatUI({ city, defaultTokens, initialPrompt }: ChatUIProps) {
  const [input, setInput] = useState(initialPrompt ?? '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [slates, setSlates] = useState<SlateMap | null>(null);
  const [activeTab, setActiveTab] = useState<SlateKey>('best');
  const [error, setError] = useState<string | null>(null);
  const [intention, setIntention] = useState<Intention | null>(null);
  const [traceId, setTraceId] = useState<string | undefined>(undefined);
  const streamCancel = useRef<ReturnType<typeof streamChat> | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSend = (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text) return;

    if (traceId) {
      logClientEvent('reask', { screen: 'chat', traceId, freeText: text });
    }
    setInput('');
    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    const assistantId = crypto.randomUUID();

    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: 'assistant', text: '' }]);
    streamCancel.current?.cancel();

    const cancel = streamChat(
      { prompt: text, city, tokens: defaultTokens },
      {
        onMessage: ({ text: chunk }) => {
          if (!chunk) return;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, text: msg.text + chunk } : msg))
          );
        },
        onComplete: (payload) => {
          setIsLoading(false);
          setSlates(payload?.slates ?? null);
          setActiveTab('best');
          setIntention(payload?.intention ?? null);
          setTraceId(payload?.traceId);
          logClientEvent('query', {
            screen: 'chat',
            traceId: payload?.traceId,
            intention: payload?.intention,
            freeText: text,
            source: 'chat',
          });
          if (payload?.slates) {
            (Object.keys(payload.slates) as SlateKey[]).forEach((key) => {
              const slateItems = payload.slates?.[key];
              if (!slateItems?.length) return;
              logClientEvent('slate_impression', {
                screen: 'chat',
                traceId: payload?.traceId,
                slateLabel: key,
                eventIds: slateItems.map((item) => item.id),
                scores: slateItems.map((item) => item.fitScore).filter((val) => typeof val === 'number'),
                position: 0,
                intention: payload?.intention,
              });
            });
          }
          if (payload?.summary) {
            setMessages((prev) =>
              prev.map((msg) => (msg.id === assistantId ? { ...msg, meta: payload.summary } : msg))
            );
          }
        },
        onError: (err) => {
          setIsLoading(false);
          setError(err.message || 'Unable to complete request.');
          logClientEvent('error', {
            screen: 'chat',
            traceId,
            message: err.message,
          });
        },
      }
    );

    streamCancel.current = cancel;
  };

  return (
    <div className="space-y-8">
      {error && (
        <ErrorState
          title="The signal broke"
          description={error}
          onRetry={() => {
            if (messages.length) {
              const lastUserPrompt = [...messages].reverse().find((msg) => msg.role === 'user');
              if (lastUserPrompt) {
                setInput(lastUserPrompt.text);
              }
            }
            setError(null);
          }}
        />
      )}
      <ChatMessageList messages={messages} isStreaming={isLoading} />
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => handleSend()}
        onMicResult={(text) => setInput(text)}
        onMicError={(err) => setError(err.message)}
        disabled={isLoading}
      />
      {isLoading && !slates && (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <SkeletonStoryCard key={idx} />
          ))}
        </div>
      )}
      <SlateTabs slates={slates} activeTab={activeTab} onTabChange={setActiveTab} intention={intention} traceId={traceId} />
    </div>
  );
}
