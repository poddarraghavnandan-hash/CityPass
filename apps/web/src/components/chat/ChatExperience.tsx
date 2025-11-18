'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Intention, IntentionTokens, RankedItem } from '@citypass/types';
import { AssistantIntro } from './AssistantIntro';
import { ExampleQueries } from './ExampleQueries';
import { ChatHistory, type ChatMessage } from './ChatHistory';
import { ChatInputRow } from './ChatInputRow';
import { SlateReveal } from './SlateReveal';
import { EventModal } from './EventModal';
import { ChatError } from './ChatError';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

type ChatExperienceProps = {
  city: string;
  defaultTokens: IntentionTokens;
  initialPrompt?: string;
};

type SlateKey = 'best' | 'wildcard' | 'closeAndEasy';
type SlateMap = Partial<Record<SlateKey, RankedItem[]>>;

export function ChatExperience({ city, defaultTokens, initialPrompt }: ChatExperienceProps) {
  const [input, setInput] = useState(initialPrompt ?? '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const handleSelectExample = (query: string) => {
    setInput(query);
    handleSubmit(query);
  };

  const makeId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

  const handleSubmit = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text || loading) return;

    setError(null);
    setInput('');
    setLoading(true);
    setSlates(null);

    const userMessage: ChatMessage = { id: makeId(), role: 'user', text };
    const assistantId = makeId();

    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: 'assistant', text: 'Lining up options…' }]);

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

      setMessages((prev) => prev.map((msg) => (msg.id === assistantId ? { ...msg, text: 'Here are your picks.' } : msg)));

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

  const degradeNote = useMemo(() => {
    return intention?.degradedFlags ? 'Limited results' : null;
  }, [intention]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur"
      >
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">CityLens Concierge</p>
          <p className="text-lg font-semibold text-white">One input. Instant vibe.</p>
        </div>
        {degradeNote && <span className="rounded-full border border-yellow-300/30 bg-yellow-300/10 px-3 py-1 text-xs text-yellow-200">{degradeNote}</span>}
      </motion.header>

      <AssistantIntro />
      <ExampleQueries onSelect={handleSelectExample} />

      <ChatHistory messages={messages} />

      <SlateReveal slates={slates} loading={loading} onOpen={setOpenItem} traceId={traceId} intention={intention} />

      {error && <ChatError message={error} onRetry={() => handleSubmit()} />}

      <ChatInputRow
        value={input}
        onChange={setInput}
        onSubmit={() => handleSubmit()}
        onMicResult={(text) => setInput(text)}
        onMicError={(err) => setError(err.message)}
        disabled={loading}
      />

      <EventModal item={openItem} onClose={() => setOpenItem(null)} traceId={traceId} />
    </>
  );
}
