'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MicButton } from './MicButton';
import { MessageBubbles } from './MessageBubbles';
import { SlateCards } from './SlateCards';
import { streamChat } from '@/lib/chat/streamClient';
import type { Intention, IntentionTokens, RankedItem } from '@citypass/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
}

type HistoryChip = { id: string; label: string; prompt: string };

interface ChatUIProps {
  city: string;
  defaultTokens: IntentionTokens;
  initialPrompt?: string;
}

export function ChatUI({ city, defaultTokens, initialPrompt }: ChatUIProps) {
  const [input, setInput] = useState(initialPrompt ?? '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [slates, setSlates] = useState<{
    best?: RankedItem[];
    wildcard?: RankedItem[];
    closeAndEasy?: RankedItem[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'best' | 'wildcard' | 'closeAndEasy'>('best');
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<Intention | null>(null);
  const history = useRef<HistoryChip[]>([]);
  const [historyChips, setHistoryChips] = useState<HistoryChip[]>([]);
  const streamCancel = useRef<ReturnType<typeof streamChat> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('citylens:chat-history');
    if (stored) {
      try {
        history.current = JSON.parse(stored);
        setHistoryChips(history.current);
      } catch {
        history.current = [];
      }
    }
  }, []);

  useEffect(() => {
    if (initialPrompt) {
      setInput(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSend = (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text) return;

    setError(null);
    setIsLoading(true);
    setInput('');

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    streamCancel.current?.cancel();

    let assistantId = crypto.randomUUID();
    const baseAssistant: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
    };
    setMessages((prev) => [...prev, baseAssistant]);

    const cancel = streamChat(
      { prompt: text, city, tokens: defaultTokens },
      {
        onMessage: ({ text: chunk }) => {
          if (!chunk) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    text: msg.text + chunk,
                  }
                : msg
            )
          );
        },
        onComplete: (payload) => {
          setIsLoading(false);
          setSlates(payload?.slates ?? null);
          setActiveTab('best');
          setIntent(payload?.intention ?? null);
          if (payload?.summary) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      meta: payload.summary,
                    }
                  : msg
              )
            );
          }
          history.current.unshift({
            id: assistantId,
            prompt: text,
            label: payload?.intentionSummary ?? 'Recent',
          });
          history.current = history.current.slice(0, 6);
          setHistoryChips([...history.current]);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('citylens:chat-history', JSON.stringify(history.current));
          }
        },
        onError: (err) => {
          setIsLoading(false);
          setError(err.message || 'Unable to complete request.');
        },
      }
    );

    streamCancel.current = cancel;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
        <MessageBubbles messages={messages} />
        {error && (
          <p className="text-sm text-red-300">
            {error}{' '}
            <Button variant="link" asChild>
              <a href="/feed" className="underline">
                Try the feed
              </a>
            </Button>
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSend();
          }}
          className="flex flex-col gap-3 md:flex-row"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. Something strenuous at 6pm near Midtown"
            className="flex-1 rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
            rows={2}
            disabled={isLoading}
          />
          <div className="flex items-center gap-2">
            <MicButton onTranscript={setInput} onError={(err) => setError(err.message)} />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? 'Tuning…' : 'Send'}
            </Button>
          </div>
        </form>
        {historyChips.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs text-white/70">
            {historyChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleSend(chip.prompt)}
                className="rounded-full border border-white/20 px-3 py-1"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <SlateCards slates={slates} activeTab={activeTab} onTabChange={setActiveTab} intention={intent} />
    </div>
  );
}
