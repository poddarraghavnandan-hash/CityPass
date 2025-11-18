'use client';

import { useEffect, useState } from 'react';
import type { Intention, IntentionTokens, RankedItem } from '@citypass/types';
import { ChatHeader } from './ChatHeader';
import { ChatMain } from './ChatMain';
import { ChatMessages, type ChatBubble } from './ChatMessages';
import { SlateCarousel } from './SlateCarousel';
import { ChatInputBar } from './ChatInputBar';
import { EventModal } from './EventModal';
import { logClientEvent } from '@/lib/analytics/logClientEvent';
import { ChatError } from './ChatError';

type ChatExperienceProps = {
  city: string;
  defaultTokens: IntentionTokens;
  initialPrompt?: string;
};

type SlateKey = 'best' | 'wildcard' | 'closeAndEasy';
type SlateMap = Partial<Record<SlateKey, RankedItem[]>>;

export function ChatExperience({ city, defaultTokens, initialPrompt }: ChatExperienceProps) {
  const [input, setInput] = useState(initialPrompt ?? '');
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [slates, setSlates] = useState<SlateMap | null>(null);
  const [intention, setIntention] = useState<Intention | null>(null);
  const [traceId, setTraceId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<RankedItem | null>(null);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

  const handleSubmit = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || loading) return;

    setError(null);
    setInput('');
    setLoading(true);
    setSlates(null);

    const userMessage: ChatBubble = { id: makeId(), role: 'user', text };
    const assistantId = makeId();

    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: 'assistant', text: 'Pulling the best options…' }]);

    try {
      const askResponse = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeText: text,
          context: {
            city,
            overrides: defaultTokens,
          },
        }),
      });

      if (!askResponse.ok) {
        throw new Error('Could not understand the request.');
      }

      const askData = await askResponse.json();
      const inferredTokens: IntentionTokens =
        askData.tokens || askData.intention?.tokens || askData.intention?.state?.intention?.tokens || defaultTokens;

      setIntention(askData.intention ?? null);
      setTraceId(askData.traceId);

      logClientEvent('query', {
        screen: 'chat',
        traceId: askData.traceId,
        freeText: text,
        source: 'chat',
        phase: 'ask',
      });

      setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...msg, text: 'Curating the night…' } : msg)));

      const planResponse = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freeText: text,
          tokens: inferredTokens,
        }),
      });

      if (!planResponse.ok) {
        throw new Error('Unable to fetch slates right now.');
      }

      const planData = await planResponse.json();
      const slatePayload: SlateMap = planData.slates || null;
      const planTraceId = planData.traceId || askData.traceId;

      setTraceId(planTraceId);
      setSlates(slatePayload);
      setIntention(planData.intention ?? askData.intention ?? null);

      setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...msg, text: 'Got it. Here are your picks.' } : msg)));

      if (slatePayload) {
        (Object.keys(slatePayload) as SlateKey[]).forEach((key) => {
          const items = slatePayload[key];
          if (!items?.length) return;
          logClientEvent('slate_impression', {
            screen: 'chat',
            traceId: planTraceId,
            slateLabel: key,
            eventIds: items.map((item) => item.id),
            intention: planData.intention ?? askData.intention,
          });
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
      setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...msg, text: 'Could not load suggestions.' } : msg)));
      logClientEvent('error', { screen: 'chat', traceId, message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ChatHeader city={city} />
      <ChatMain>
        <ChatMessages messages={messages} />
        <SlateCarousel slates={slates} loading={loading} onOpen={(item) => setOpenItem(item)} traceId={traceId} intention={intention} />
        {error && <ChatError message={error} onRetry={() => handleSubmit()} />}
      </ChatMain>
      <ChatInputBar value={input} onChange={setInput} onSubmit={() => handleSubmit()} disabled={loading} />
      <EventModal item={openItem} onClose={() => setOpenItem(null)} traceId={traceId} />
    </>
  );
}
