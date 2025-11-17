'use client';

import { useEffect, useMemo, useState } from 'react';
import type { IntentionTokens } from '@citypass/types';
import { PageShell } from '@/components/layout/PageShell';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { TasteGraph } from '@/components/profile/TasteGraph';
import { PreferenceToggles } from '@/components/profile/PreferenceToggles';
import { BudgetAndDistance } from '@/components/profile/BudgetAndDistance';
import { Button } from '@/components/ui/button';
import { MoodStep } from '@/components/onboarding/MoodStep';
import type { Preferences } from '@/lib/preferences';
import { useToast } from '@/components/ui/toast';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

export default function ProfilePage() {
  const [socialProof, setSocialProof] = useState(true);
  const [soloFriendly, setSoloFriendly] = useState(false);
  const [budget, setBudget] = useState('casual');
  const [distanceKm, setDistanceKm] = useState(6);
  const [mood, setMood] = useState<IntentionTokens['mood']>('electric');
  const [interests, setInterests] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error' | 'saved'>('loading');
  const [error, setError] = useState<string | null>(null);
  const { success, error: errorToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      try {
        const response = await fetch('/api/preferences');
        if (!response.ok) throw new Error('Unable to load preferences');
        const payload = await response.json();
        const prefs: Preferences | null = payload?.preferences ?? null;
        if (prefs) {
          setMood(prefs.mood);
          setInterests(prefs.interests ?? []);
          setDistanceKm(prefs.distanceKm ?? 6);
          setBudget(prefs.budget ?? 'casual');
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

  const tasteScores = useMemo(
    () => ({
      music: interests.some((item) => /sound/i.test(item)) ? 0.9 : 0.6,
      movement: interests.some((item) => /movement|active/i.test(item)) ? 0.85 : 0.55,
      social: soloFriendly ? 0.55 : 0.8,
      arts: interests.some((item) => /art/i.test(item)) ? 0.9 : 0.6,
      nature: interests.some((item) => /nature/i.test(item)) ? 0.8 : 0.5,
    }),
    [interests, soloFriendly]
  );

  const saveProfile = async () => {
    setStatus('saving');
    setError(null);
    try {
      const payload = { mood, interests, distanceKm, budget, socialProof, soloFriendly };
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to save profile');
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
      success('Profile saved', 'Preferences stored for chat and feed.');
      logClientEvent('profile_update', {
        screen: 'profile',
        mood,
        interests,
        distanceKm,
        budget,
        socialProof,
        soloFriendly,
      });
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Save failed');
      errorToast('Save failed', err?.message || 'Unable to save preferences');
      logClientEvent('error', { screen: 'profile', message: err?.message || 'Save failed' });
    }
  };

  const onChangeAndLog = (payload: Partial<Preferences>) => {
    logClientEvent('profile_update', { screen: 'profile', ...payload });
  };

  return (
    <PageShell>
      <div className="space-y-8">
        <SectionTitle
          eyebrow="Profile"
          title="Tune your taste graph"
          description="We listen to every chat, feed open, and booking to sharpen your orbit."
        />
        <div className="grid gap-8 md:grid-cols-[1.2fr,0.8fr]">
          <div className="rounded-[40px] border border-white/10 bg-white/5 p-8">
            <TasteGraph scores={tasteScores} />
          </div>
          <div className="space-y-4">
            <MoodStep
              value={mood}
              onChange={(val) => {
                setMood(val);
                onChangeAndLog({ mood: val });
              }}
            />
            <PreferenceToggles
              social={soloFriendly}
              setSocial={(val) => {
                setSoloFriendly(val);
                onChangeAndLog({ soloFriendly: val });
              }}
              proof={socialProof}
              setProof={(val) => {
                setSocialProof(val);
                onChangeAndLog({ socialProof: val });
              }}
            />
            <BudgetAndDistance
              budget={budget}
              onBudgetChange={(val) => {
                setBudget(val);
                onChangeAndLog({ budget: val });
              }}
              distanceKm={distanceKm}
              onDistanceChange={(val) => {
                setDistanceKm(val);
                onChangeAndLog({ distanceKm: val });
              }}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button className="w-full rounded-full bg-white text-black hover:bg-white/80" onClick={saveProfile} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save profile'}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
