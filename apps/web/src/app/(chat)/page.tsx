import { Suspense } from 'react';
import { ChatUI } from '@/components/chat/ChatUI';
import '@/styles/chat.css';
import type { IntentionTokens } from '@citypass/types';

export const metadata = {
  title: 'CityLens Chat',
};

interface ChatPageProps {
  searchParams?: Record<string, string | string[] | undefined>;
}

export default function ChatPage({ searchParams }: ChatPageProps) {
  const city = (searchParams?.city as string) || process.env.NEXT_PUBLIC_DEFAULT_CITY || 'New York';

  const allowedMoods: IntentionTokens['mood'][] = ['calm', 'social', 'electric', 'artistic', 'grounded'];
  const allowedBudgets: IntentionTokens['budget'][] = ['free', 'casual', 'splurge'];
  const allowedCompanions: IntentionTokens['companions'][number][] = ['solo', 'partner', 'crew', 'family'];

  const pickMood = (value?: string): IntentionTokens['mood'] =>
    value && allowedMoods.includes(value as IntentionTokens['mood']) ? (value as IntentionTokens['mood']) : 'electric';

  const pickBudget = (value?: string): IntentionTokens['budget'] =>
    value && allowedBudgets.includes(value as IntentionTokens['budget'])
      ? (value as IntentionTokens['budget'])
      : 'casual';

  const pickCompanions = (value?: string): IntentionTokens['companions'] => {
    if (!value) return ['solo'];
    const selections = value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry): entry is IntentionTokens['companions'][number] =>
        allowedCompanions.includes(entry as IntentionTokens['companions'][number])
      );
    return selections.length ? selections : ['solo'];
  };

  const defaultTokens: IntentionTokens = {
    mood: pickMood(searchParams?.mood as string | undefined),
    untilMinutes: searchParams?.untilMinutes ? Number(searchParams.untilMinutes) : 180,
    distanceKm: searchParams?.distanceKm ? Number(searchParams.distanceKm) : 6,
    budget: pickBudget(searchParams?.budget as string | undefined),
    companions: pickCompanions(searchParams?.companions as string | undefined),
  };

  const initialPrompt = searchParams?.prompt as string | undefined;

  return (
    <Suspense fallback={<div className="p-8 text-white/70">Loading CityLens…</div>}>
      <main className="chat-shell min-h-screen px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <header className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">CityLens Voice + Text</p>
            <h1 className="text-4xl font-semibold text-white">Where should we go next?</h1>
            <p className="text-white/70">
              Describe the vibe. CityLens streams ideas, grounded slates, and links out to your personalized feed.
            </p>
          </header>

          <ChatUI city={city} defaultTokens={defaultTokens} initialPrompt={initialPrompt} />
        </div>
      </main>
    </Suspense>
  );
}
