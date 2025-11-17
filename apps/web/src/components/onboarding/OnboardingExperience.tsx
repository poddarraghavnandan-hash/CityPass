'use client';

import { useEffect, useState } from 'react';
import type { IntentionTokens } from '@citypass/types';
import { Button } from '@/components/ui/button';
import { MoodStep } from './MoodStep';
import { InterestStep } from './InterestStep';
import { ScheduleStep } from './ScheduleStep';
import { PreferenceToggles } from '@/components/profile/PreferenceToggles';
import type { Preferences } from '@/lib/preferences';
import { OnboardingStepper } from './OnboardingStepper';
import { useToast } from '@/components/ui/toast';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

export function OnboardingExperience() {
  const [mood, setMood] = useState<IntentionTokens['mood']>('electric');
  const [interests, setInterests] = useState<string[]>(['Nightlife']);
  const [distance, setDistance] = useState(5);
  const [budget, setBudget] = useState('casual');
  const [socialProof, setSocialProof] = useState(true);
  const [soloFriendly, setSoloFriendly] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const { success, error: errorToast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/preferences');
        if (!response.ok) throw new Error('Unable to load preferences');
        const payload = await response.json();
        if (payload?.preferences) {
          const prefs: Preferences = payload.preferences;
          setMood(prefs.mood);
          setInterests(prefs.interests || []);
          setDistance(prefs.distanceKm ?? 5);
          setBudget(prefs.budget ?? 'casual');
          setSocialProof(prefs.socialProof ?? true);
          setSoloFriendly(prefs.soloFriendly ?? false);
        }
      } catch (err) {
        console.warn('Onboarding preferences load failed', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleInterest = (value: string) => {
    setInterests((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const handleSave = async () => {
    setStatus('saving');
    setError(null);
    try {
      const payload = {
        mood,
        interests,
        distanceKm: distance,
        budget,
        socialProof,
        soloFriendly,
      };
      const response = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('Unable to save preferences');
      }
      const data = await response.json();
      setStatus('saved');
      if (typeof window !== 'undefined') {
        localStorage.setItem('citylens:intention', JSON.stringify({ mood, distanceKm: distance, budget, untilMinutes: 180, companions: ['solo'] }));
        localStorage.setItem('citylens:preferences', JSON.stringify(data.preferences));
      }
      setTimeout(() => setStatus('idle'), 1500);
      success('Profile saved', 'Preferences stored for chat and feed.');
      logClientEvent('onboarding_update', { screen: 'onboarding', ...payload });
    } catch (err: any) {
      setStatus('idle');
      setError(err?.message || 'Save failed');
      errorToast('Save failed', err?.message || 'Unable to save preferences');
      logClientEvent('error', { screen: 'onboarding', message: err?.message || 'Save failed' });
    }
  };

  const nextStep = () => setStep((prev) => Math.min(3, prev + 1));
  const previousStep = () => setStep((prev) => Math.max(1, prev - 1));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <MoodStep
            value={mood}
            onChange={(val) => {
              setMood(val);
              logClientEvent('onboarding_update', { screen: 'onboarding', mood: val, step });
            }}
          />
        );
      case 2:
        return (
          <InterestStep
            values={interests}
            onToggle={(val) => {
              toggleInterest(val);
              logClientEvent('onboarding_update', { screen: 'onboarding', interests: interests.includes(val) ? interests.filter((i) => i !== val) : [...interests, val], step });
            }}
          />
        );
      case 3:
      default:
        return (
          <>
            <ScheduleStep
              distanceKm={distance}
              onDistanceChange={(val) => {
                setDistance(val);
                logClientEvent('onboarding_update', { screen: 'onboarding', distanceKm: val, budget, step });
              }}
              budget={budget}
              onBudgetChange={(val) => {
                setBudget(val);
                logClientEvent('onboarding_update', { screen: 'onboarding', distanceKm: distance, budget: val, step });
              }}
            />
            <PreferenceToggles
              social={soloFriendly}
              setSocial={(val) => {
                setSoloFriendly(val);
                logClientEvent('onboarding_update', { screen: 'onboarding', soloFriendly: val, step });
              }}
              proof={socialProof}
              setProof={(val) => {
                setSocialProof(val);
                logClientEvent('onboarding_update', { screen: 'onboarding', socialProof: val, step });
              }}
            />
          </>
        );
    }
  };

  return (
    <div className="space-y-8 rounded-[40px] border border-white/10 bg-white/5 p-8">
      {loading ? (
        <div className="animate-pulse text-white/60">Loading preferences…</div>
      ) : (
        <>
          <OnboardingStepper step={step} total={3} />
          {renderStep()}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-3">
            {step > 1 && (
              <Button variant="ghost" className="rounded-full border border-white/20 text-white hover:bg-white/10" onClick={previousStep}>
                Back
              </Button>
            )}
            {step < 3 && (
              <Button className="rounded-full bg-white text-black hover:bg-white/80" onClick={nextStep}>
                Next
              </Button>
            )}
            {step === 3 && (
              <Button
                onClick={handleSave}
                className="rounded-full bg-white text-black hover:bg-white/80"
                disabled={status === 'saving'}
              >
                {status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved ✓' : 'Save profile'}
              </Button>
            )}
            <Button asChild variant="ghost" className="rounded-full border border-white/20 text-white hover:bg-white/10">
              <a href="/feed">Skip to feed</a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
