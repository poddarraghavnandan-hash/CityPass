import { Suspense } from 'react';
import type { IntentionTokens } from '@citypass/types';
import { ChatUI } from '@/components/chat/ChatUI';
import { PageShell } from '@/components/layout/PageShell';
import { GlowBadge } from '@/components/ui/GlowBadge';
import { cookies } from 'next/headers';
import { parsePreferencesCookie } from '@/lib/preferences';

export const metadata = {
  title: 'CityLens Copilot',
};

interface ChatPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const moods: IntentionTokens['mood'][] = ['calm', 'social', 'electric', 'artistic', 'grounded'];
const budgets: IntentionTokens['budget'][] = ['free', 'casual', 'splurge'];
const companions: IntentionTokens['companions'][number][] = ['solo', 'partner', 'crew', 'family'];

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  const city = (params?.city as string) || process.env.NEXT_PUBLIC_DEFAULT_CITY || 'New York';
  const prefCookie = (await cookies()).get('citylens_prefs')?.value;
  const prefs = parsePreferencesCookie(prefCookie);
  const defaultTokens: IntentionTokens = {
    mood: prefs?.mood ?? parseMood(params?.mood as string),
    untilMinutes: params?.untilMinutes ? Number(params.untilMinutes) : 180,
    distanceKm: prefs?.distanceKm ?? (params?.distanceKm ? Number(params.distanceKm) : 6),
    budget: prefs?.budget ?? parseBudget(params?.budget as string),
    companions: parseCompanions(params?.companions as string),
  };

  const initialPrompt = params?.prompt as string | undefined;

  return (
    <PageShell>
      <section className="mx-auto max-w-4xl space-y-6 pt-6">
        <div className="rounded-[40px] border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-black/30 p-8 text-white shadow-[0_20px_120px_rgba(7,1,26,0.65)]">
          <GlowBadge>Copilot</GlowBadge>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">What kind of night?</h1>
        </div>
        <Suspense fallback={<div className="rounded-3xl border border-white/5 bg-white/5 p-6 text-white/70">Warming up the chat…</div>}>
          <ChatUI city={city} defaultTokens={defaultTokens} initialPrompt={initialPrompt} />
        </Suspense>
      </section>
    </PageShell>
  );
}

function parseMood(value?: string): IntentionTokens['mood'] {
  return value && moods.includes(value as IntentionTokens['mood']) ? (value as IntentionTokens['mood']) : 'electric';
}

function parseBudget(value?: string): IntentionTokens['budget'] {
  return value && budgets.includes(value as IntentionTokens['budget']) ? (value as IntentionTokens['budget']) : 'casual';
}

function parseCompanions(value?: string): IntentionTokens['companions'] {
  if (!value) return ['solo'];
  const picks = value
    .split(',')
    .map((part) => part.trim())
    .filter((entry): entry is IntentionTokens['companions'][number] => companions.includes(entry as IntentionTokens['companions'][number]));
  return picks.length ? picks : ['solo'];
}
