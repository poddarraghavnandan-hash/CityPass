import type { IntentionTokens } from '@citypass/types';
import { cookies } from 'next/headers';
import { ChatShell } from '@/components/chat/ChatShell';
import { ChatExperience } from '@/components/chat/ChatExperience';
import { parsePreferencesCookie } from '@/lib/preferences';

export const metadata = {
  title: 'CityLens Concierge',
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
    <ChatShell>
      <ChatExperience city={city} defaultTokens={defaultTokens} initialPrompt={initialPrompt} />
    </ChatShell>
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
