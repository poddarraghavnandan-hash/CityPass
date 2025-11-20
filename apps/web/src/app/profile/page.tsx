'use client';

import { useEffect, useState } from 'react';
import type { IntentionTokens } from '@citypass/types';
import { ProfileShell } from '@/components/profile/ProfileShell';
import { TasteForm } from '@/components/profile/TasteForm';
import { PageShell } from '@/components/layout/PageShell';
import type { Preferences } from '@/lib/preferences';
import { useToast } from '@/components/ui/toast';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const budgetDisplayMap: Record<Preferences['budget'], 'free' | '$' | '$$' | '$$$'> = {
  free: 'free',
  casual: '$',
  splurge: '$$',
};

const displayToBudget = (display: 'free' | '$' | '$$' | '$$$'): Preferences['budget'] => {
  if (display === 'free') return 'free';
  if (display === '$') return 'casual';
  return 'splurge';
};

const minutesFromDistance = (distanceKm: number) => Math.min(45, Math.max(10, Math.round(distanceKm * 6)));
const kmFromMinutes = (minutes: number) => Math.max(1, Math.round((minutes / 5) * 10) / 10);

export default function ProfilePage() {
  const [status, setStatus] = useState<Status>('loading');
  const [mood, setMood] = useState<IntentionTokens['mood']>('electric');
  const [interests, setInterests] = useState<string[]>([]);
  const [distanceKm, setDistanceKm] = useState(5);
  const [travelMinutes, setTravelMinutes] = useState(minutesFromDistance(5));
  const [budget, setBudget] = useState<Preferences['budget']>('casual');
  const [budgetDisplay, setBudgetDisplay] = useState<'free' | '$' | '$$' | '$$$'>(budgetDisplayMap.casual);
  const [socialProof, setSocialProof] = useState(true);
  const [soloFriendly, setSoloFriendly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: errorToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/preferences');
        if (!response.ok) throw new Error('Unable to load preferences');
        const payload = await response.json();
        const prefs: Preferences | null = payload?.preferences ?? null;
        if (prefs) {
          setMood(prefs.mood);
          setInterests(prefs.interests ?? []);
          setDistanceKm(prefs.distanceKm ?? 5);
          setTravelMinutes(minutesFromDistance(prefs.distanceKm ?? 5));
          setBudget(prefs.budget ?? 'casual');
          setBudgetDisplay(budgetDisplayMap[prefs.budget ?? 'casual']);
          setSocialProof(prefs.socialProof ?? true);
          setSoloFriendly(prefs.soloFriendly ?? false);
        }
        setStatus('idle');
      } catch (err: any) {
        setStatus('error');
        setError(err?.message || 'Unable to load preferences');
      }
    };
    load();
  }, []);

  const handleTravelChange = (minutes: number) => {
    setTravelMinutes(minutes);
    setDistanceKm(kmFromMinutes(minutes));
  };

  const handleBudgetDisplayChange = (display: 'free' | '$' | '$$' | '$$$') => {
    setBudgetDisplay(display);
    setBudget(displayToBudget(display));
  };

  const handleSave = async () => {
    setStatus('saving');
    setError(null);
    try {
      const payload: Preferences = {
        mood,
        interests,
        distanceKm,
        budget,
        socialProof,
        soloFriendly,
      };
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save preferences');
      setStatus('saved');
      success('Preferences saved', "We'll use these for chat and feed.");
      logClientEvent('profile_update', { ...payload, screen: 'profile' });
      setTimeout(() => setStatus('idle'), 1500);
    } catch (err: any) {
      const message = err?.message || 'Unable to save preferences';
      setStatus('error');
      setError(message);
      errorToast('Save failed', message);
      logClientEvent('error', { screen: 'profile', message });
    }
  };

  return (
    <PageShell>
      <ProfileShell status={status} onSave={handleSave} error={error}>
        <TasteForm
          mood={mood}
          onMoodChange={setMood}
          interests={interests}
          onInterestsChange={setInterests}
          soloFriendly={soloFriendly}
          onSoloChange={setSoloFriendly}
          socialProof={socialProof}
          onSocialChange={setSocialProof}
          budgetDisplay={budgetDisplay}
          onBudgetDisplayChange={handleBudgetDisplayChange}
          travelMinutes={travelMinutes}
          onTravelChange={handleTravelChange}
        />
      </ProfileShell>
    </PageShell>
  );
}
