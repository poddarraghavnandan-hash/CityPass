"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Chip } from '@/components/ui/Chip';
import type { Preferences } from '@/lib/preferences';
import { logClientEvent } from '@/lib/analytics/logClientEvent';

type Status = 'idle' | 'saving' | 'done';

const archetypes = [
  { label: 'Morning mover', value: 'morning', description: 'Up early for workouts and walks.', mood: 'electric' as const },
  { label: 'Night navigator', value: 'night', description: 'Late dinners, music, lights.', mood: 'social' as const },
  { label: 'Culture sponge', value: 'culture', description: 'Museums, galleries, cinemas.', mood: 'artistic' as const },
  { label: 'Open-air wanderer', value: 'outdoors', description: 'Parks, waterfronts, long walks.', mood: 'grounded' as const },
  { label: 'Third-place worker', value: 'work', description: 'Cafés, coworking, quiet corners.', mood: 'calm' as const },
];

const noOptions = ['Loud clubs', 'Crowds', 'Long lines', 'Expensive tasting menus', 'Tourist traps'];

const kmFromMinutes = (minutes: number) => Math.max(1, Math.round((minutes / 5) * 10) / 10);

export function Steps() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>([]);
  const [travelMinutes, setTravelMinutes] = useState(20);
  const [noList, setNoList] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const toggleArchetype = (value: string) => {
    setSelectedArchetypes((prev) => {
      if (prev.includes(value)) return prev.filter((item) => item !== value);
      if (prev.length >= 3) return [...prev.slice(1), value];
      return [...prev, value];
    });
  };

  const toggleNo = (value: string) => {
    setNoList((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 2));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleComplete = async () => {
    setStatus('saving');
    setError(null);
    const lastMood =
      archetypes.find((item) => item.value === selectedArchetypes[selectedArchetypes.length - 1])?.mood ?? 'electric';
    const payload: Preferences = {
      mood: lastMood,
      interests: [...selectedArchetypes, ...noList.map((item) => `no:${item.toLowerCase()}`)],
      distanceKm: kmFromMinutes(travelMinutes),
      budget: 'casual',
      socialProof: true,
      soloFriendly: selectedArchetypes.includes('work'),
    };

    try {
      await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      logClientEvent('onboarding_complete', payload);
      setStatus('done');
      router.push('/chat?prompt=Surprise%20me%20with%20a%20plan');
    } catch (err: any) {
      setStatus('idle');
      setError(err?.message || 'Unable to save. Try again.');
    }
  };

  const disabledNext = step === 0 && selectedArchetypes.length === 0;

  return (
    <section className="flex h-full min-h-0 flex-col text-white">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-6">
        {step === 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">What sounds most like you?</h2>
            <p className="text-sm text-white/70">Choose up to three archetypes and we&apos;ll tune the default mood.</p>
            <div className="space-y-3">
              {archetypes.map((item) => {
                const active = selectedArchetypes.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggleArchetype(item.value)}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      active ? 'border-teal-400 bg-teal-400/10' : 'border-white/10 bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium">{item.label}</span>
                      {active && <span className="text-xs uppercase text-teal-200">Selected</span>}
                    </div>
                    <p className="text-sm text-white/70">{item.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">How far do you usually go?</h2>
            <p className="text-sm text-white/70">Slide between a short walk and a cross-town adventure.</p>
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
              <input
                type="range"
                min={10}
                max={45}
                step={5}
                value={travelMinutes}
                onChange={(event) => setTravelMinutes(Number(event.target.value))}
                className="w-full accent-teal-300"
              />
              <div className="mt-4 flex items-center justify-between text-sm text-white/60">
                <span>10 min</span>
                <span>{travelMinutes} min</span>
                <span>45 min</span>
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Any hard no’s?</h2>
            <p className="text-sm text-white/70">We’ll keep these out of the feed unless you explicitly ask.</p>
            <div className="flex flex-wrap gap-2">
              {noOptions.map((option) => (
                <Chip
                  key={option}
                  variant={noList.includes(option) ? 'solid' : 'soft'}
                  active={noList.includes(option)}
                  onClick={() => toggleNo(option)}
                >
                  {option}
                </Chip>
              ))}
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 0 || status === 'saving'}
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={step === 2 ? handleComplete : nextStep}
          disabled={status === 'saving' || disabledNext}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#050509] disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : step === 2 ? 'Finish & open chat' : 'Continue'}
        </button>
      </div>
    </section>
  );
}
