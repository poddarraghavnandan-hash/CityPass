'use client';

import { useEffect, useRef, useState } from 'react';
import type { Intention, IntentionTokens, RankedItem } from '@citypass/types';
import { streamChat } from '@/lib/chat/streamClient';
import { ChatMessageList, type ChatMessage } from './ChatMessageList';
import { ChatInputBar } from './ChatInputBar';
import { SlateTabs } from './SlateTabs';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonStoryCard } from '@/components/feed/SkeletonStoryCard';
import { logClientEvent } from '@/lib/analytics/logClientEvent';
import { AnimatePresence, motion } from 'framer-motion';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, slates, isLoading]);

  const handleSend = (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text) return;

    if (traceId) {
      logClientEvent('reask', { screen: 'chat', traceId, freeText: text });
    }
    setInput('');
    setError(null);
    setIsLoading(true);
    setSlates(null); // Clear previous slates on new query

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
                eventIds: slateItems.map((item: any) => item.id),
                scores: slateItems.map((item: any) => item.fitScore).filter((val: any) => typeof val === 'number'),
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
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-background text-foreground">
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
        <div className="mx-auto max-w-3xl space-y-8">
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <h1 className="text-4xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Where to next?
              </h1>
              <p className="text-lg text-muted-foreground">
                Ask CityLens for personalized plans in {city}.
              </p>
            </motion.div>
          )}

          <ChatMessageList messages={messages} isStreaming={isLoading} />

          {/* Loading State */}
          {isLoading && !slates && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid gap-4 md:grid-cols-3"
            >
              {Array.from({ length: 3 }).map((_, idx) => (
                <SkeletonStoryCard key={idx} />
              ))}
            </motion.div>
          )}

          {/* Results Area */}
          <AnimatePresence>
            {slates && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="pb-24" // Padding for sticky input
              >
                <SlateTabs 
                  slates={slates} 
                  activeTab={activeTab} 
                  onTabChange={setActiveTab} 
                  intention={intention} 
                  traceId={traceId} 
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Error Message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive"
            >
              <p className="text-sm font-medium">{error}</p>
              <button 
                onClick={() => setError(null)}
                className="mt-2 text-xs underline hover:no-underline"
              >
                Dismiss
              </button>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Sticky Input Area */}
      <div className="sticky bottom-0 z-10 w-full border-t border-white/5 bg-background/80 backdrop-blur-xl p-4 pb-8">
        <div className="mx-auto max-w-3xl">
          <ChatInputBar
            value={input}
            onChange={setInput}
            onSubmit={() => handleSend()}
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
