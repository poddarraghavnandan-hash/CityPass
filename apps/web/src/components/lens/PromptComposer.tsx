'use client';

import { useCallback, useMemo, useState } from 'react';
import type { IntentionTokens } from '@citypass/types';
import type { MoodKey } from '@/theme/lensTheme';

const PRESET_PROMPTS = [
  {
    label: 'Tonight',
    description: 'Live music with neon energy',
    prompt: 'electric live music tonight with friends',
  },
  {
    label: 'Outdoors',
    description: 'Sunset walks + food trucks',
    prompt: 'outdoor date at sunset with food trucks',
  },
  {
    label: 'Low-key',
    description: 'Cozy art or comedy',
    prompt: 'calm comedy or art show that is easy to get to',
  },
];

type ComposerMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const friendlyCompanion = (tokens: IntentionTokens) => {
  if (!tokens.companions?.length) return null;
  if (tokens.companions.length === 1) {
    const map: Record<string, string> = {
      solo: 'solo',
      partner: 'with a partner',
      crew: 'with your crew',
      family: 'with family',
    };
    return map[tokens.companions[0]] ?? tokens.companions[0];
  }
  return `with ${tokens.companions.join(' & ')}`;
};

function makeMessageId() {
  return Math.random().toString(36).slice(2, 10);
}

interface PromptComposerProps {
  city: string;
  defaultMood: MoodKey;
  onApply: (payload: {
    tokens: IntentionTokens;
    city?: string;
    prompt: string;
    summary: string;
    traceId?: string;
    source?: string;
  }) => void;
}

export function PromptComposer({ city, defaultMood, onApply }: PromptComposerProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ComposerMessage[]>([
    {
      id: makeMessageId(),
      role: 'assistant',
      text: `Hi! I'm CityLens. Tell me the vibe and I'll tune recommendations for ${city}.`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeholder = useMemo(
    () => `Example: "late night ${defaultMood} energy near ${city}"`,
    [defaultMood, city]
  );

  const runPrompt = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || isLoading) return;
      setIsLoading(true);
      setError(null);

      const userMessage: ComposerMessage = { id: makeMessageId(), role: 'user', text: prompt };
      const pendingAssistant: ComposerMessage = { id: makeMessageId(), role: 'assistant', text: 'Tuning your lens…' };
      setMessages(prev => [...prev, userMessage, pendingAssistant]);

      try {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freeText: prompt,
            context: { city },
          }),
        });

        if (!response.ok) {
          throw new Error('Unable to understand that request. Try rephrasing?');
        }

        const data = await response.json();
        const intention = data.intention;
        const nextTokens = (intention?.tokens || data.tokens) as IntentionTokens | undefined;

        if (!nextTokens) {
          throw new Error('Agent response missing intention tokens.');
        }

        onApply({
          tokens: nextTokens,
          city: intention?.city ?? city,
          prompt,
          summary: summarize(nextTokens, intention?.city ?? city),
          traceId: data.traceId,
          source: intention?.source,
        });

        setMessages(prev =>
          prev.map(msg =>
            msg.id === pendingAssistant.id
              ? {
                  ...msg,
                  text: summarize(nextTokens, intention?.city ?? city),
                }
              : msg
          )
        );
        setInput('');
      } catch (err) {
        const friendly =
          err instanceof Error ? err.message : 'Something went wrong while tuning your lens.';
        setError(friendly);
        setMessages(prev =>
          prev.map(msg =>
            msg.id === pendingAssistant.id
              ? {
                  ...msg,
                  text: friendly,
                }
              : msg
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [city, isLoading, onApply]
  );

  return (
    <section className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-xl p-5 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">CityLens Copilot</p>
          <h2 className="text-xl font-semibold text-white">Describe the vibe, get a slate instantly.</h2>
        </div>
        <div className="text-white/60 text-sm">City: {city}</div>
      </header>

      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-4 py-2 rounded-2xl text-sm max-w-[85%] ${
                message.role === 'user'
                  ? 'bg-white text-black rounded-br-sm'
                  : 'bg-white/10 text-white rounded-bl-sm'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_PROMPTS.map((preset) => (
          <button
            key={preset.prompt}
            type="button"
            className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/90 hover:border-white/40 transition"
            onClick={() => runPrompt(preset.prompt)}
          >
            <span className="font-semibold">{preset.label}</span> · {preset.description}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          runPrompt(input);
        }}
        className="flex flex-col gap-3 md:flex-row"
      >
        <input
          type="text"
          className="flex-1 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
          placeholder={placeholder}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="rounded-2xl bg-white text-black font-semibold px-6 py-3 flex items-center justify-center disabled:opacity-60"
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? 'Thinking…' : 'Ask CityLens'}
        </button>
      </form>

      {error && <p className="text-sm text-rose-300">{error}</p>}
    </section>
  );
}

function summarize(tokens: IntentionTokens, city: string) {
  const parts = [
    tokens.mood ? `${tokens.mood} mood` : null,
    tokens.budget ? `${tokens.budget} spend` : null,
    tokens.distanceKm ? `within ${Math.round(tokens.distanceKm)}km` : null,
    tokens.untilMinutes ? `next ${tokens.untilMinutes} min` : null,
    friendlyCompanion(tokens),
  ].filter(Boolean);
  const descriptor = parts.length ? parts.join(' · ') : 'curated slate';
  return `Ready for ${city}: ${descriptor}`;
}
