'use client';

import type { IntentionTokens } from '@citypass/types';
import { Chip } from '@/components/ui/Chip';

type TasteFormProps = {
  mood: IntentionTokens['mood'];
  onMoodChange: (value: IntentionTokens['mood']) => void;
  interests: string[];
  onInterestsChange: (values: string[]) => void;
  soloFriendly: boolean;
  onSoloChange: (value: boolean) => void;
  socialProof: boolean;
  onSocialChange: (value: boolean) => void;
  budgetDisplay: 'free' | '$' | '$$' | '$$$';
  onBudgetDisplayChange: (value: 'free' | '$' | '$$' | '$$$') => void;
  travelMinutes: number;
  onTravelChange: (value: number) => void;
  // Advanced settings
  dislikes: string[];
  onDislikesChange: (values: string[]) => void;
  scheduleBias?: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
  onScheduleBiasChange: (value: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible') => void;
  socialStyle?: 'solo' | 'small_groups' | 'large_crowds' | 'flexible';
  onSocialStyleChange: (value: 'solo' | 'small_groups' | 'large_crowds' | 'flexible') => void;
};

const activityOptions: Array<{ label: string; value: string; mood: IntentionTokens['mood'] }> = [
  { label: 'Chill', value: 'chill', mood: 'calm' },
  { label: 'Active', value: 'active', mood: 'electric' },
  { label: 'Creative', value: 'creative', mood: 'artistic' },
  { label: 'Nightlife', value: 'nightlife', mood: 'social' },
  { label: 'Outdoors', value: 'outdoors', mood: 'grounded' },
];

const socialOptions = [
  { label: 'Solo', value: 'solo' },
  { label: 'With friends', value: 'friends' },
  { label: 'Date', value: 'date' },
  { label: 'Family', value: 'family' },
];

const budgetOptions: Array<{ label: string; value: 'free' | '$' | '$$' | '$$$'; tier: TasteFormProps['budgetDisplay'] }> = [
  { label: 'Free', value: 'free', tier: 'free' },
  { label: '$', value: '$', tier: '$' },
  { label: '$$', value: '$$', tier: '$$' },
  { label: '$$$', value: '$$$', tier: '$$$' },
];

const dislikeOptions = [
  'Loud clubs',
  'Crowds',
  'Long lines',
  'Expensive tasting menus',
  'Tourist traps',
  'Late nights',
  'Early mornings',
  'Standing for long periods',
];

const scheduleOptions: Array<{ label: string; value: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible' }> = [
  { label: 'Morning person', value: 'morning' },
  { label: 'Afternoon', value: 'afternoon' },
  { label: 'Evening', value: 'evening' },
  { label: 'Night owl', value: 'night' },
  { label: 'Flexible', value: 'flexible' },
];

const socialStyleOptions: Array<{ label: string; value: 'solo' | 'small_groups' | 'large_crowds' | 'flexible' }> = [
  { label: 'Prefer solo', value: 'solo' },
  { label: 'Small groups', value: 'small_groups' },
  { label: 'Large crowds', value: 'large_crowds' },
  { label: 'Any size', value: 'flexible' },
];

export function TasteForm({
  mood,
  onMoodChange,
  interests,
  onInterestsChange,
  soloFriendly,
  onSoloChange,
  socialProof,
  onSocialChange,
  budgetDisplay,
  onBudgetDisplayChange,
  travelMinutes,
  onTravelChange,
  dislikes,
  onDislikesChange,
  scheduleBias,
  onScheduleBiasChange,
  socialStyle,
  onSocialStyleChange,
}: TasteFormProps) {
  const toggleInterest = (value: string) => {
    if (interests.includes(value)) {
      onInterestsChange(interests.filter((entry) => entry !== value));
    } else {
      onInterestsChange([...interests, value]);
    }
  };

  const toggleDislike = (value: string) => {
    if (dislikes.includes(value)) {
      onDislikesChange(dislikes.filter((entry) => entry !== value));
    } else {
      onDislikesChange([...dislikes, value]);
    }
  };

  const handleActivityToggle = (value: string, mappedMood: IntentionTokens['mood']) => {
    toggleInterest(value);
    onMoodChange(mappedMood);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-semibold text-white">Activity mix</h2>
        <p className="text-sm text-white/60">Tap the vibes you lean toward most.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {activityOptions.map((option) => (
            <Chip
              key={option.value}
              variant={interests.includes(option.value) || mood === option.mood ? 'solid' : 'soft'}
              active={interests.includes(option.value)}
              onClick={() => handleActivityToggle(option.value, option.mood)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-semibold text-white">Social settings</h2>
        <p className="text-sm text-white/60">We&apos;ll mix companions and scene accordingly.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {socialOptions.map((option) => {
            if (option.value === 'solo') {
              return (
                <Chip key={option.value} variant={soloFriendly ? 'solid' : 'soft'} active={soloFriendly} onClick={() => onSoloChange(!soloFriendly)}>
                  {option.label}
                </Chip>
              );
            }
            if (option.value === 'friends') {
              return (
                <Chip key={option.value} variant={socialProof ? 'solid' : 'soft'} active={socialProof} onClick={() => onSocialChange(!socialProof)}>
                  {option.label}
                </Chip>
              );
            }
            const active = interests.includes(option.value);
            return (
              <Chip key={option.value} variant={active ? 'solid' : 'soft'} active={active} onClick={() => toggleInterest(option.value)}>
                {option.label}
              </Chip>
            );
          })}
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-semibold text-white">Budget comfort</h2>
        <p className="text-sm text-white/60">It helps us balance free drops with higher-touch plans.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {budgetOptions.map((option) => (
            <Chip
              key={option.value}
              variant={budgetDisplay === option.value ? 'solid' : 'soft'}
              active={budgetDisplay === option.value}
              onClick={() => onBudgetDisplayChange(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-semibold text-white">Max travel time</h2>
        <p className="text-sm text-white/60">From door to plan. Let us know your typical tolerance.</p>
        <div className="mt-6">
          <input
            type="range"
            min={10}
            max={45}
            step={5}
            value={travelMinutes}
            onChange={(event) => onTravelChange(Number(event.target.value))}
            className="w-full accent-teal-300"
          />
          <div className="mt-2 flex items-center justify-between text-sm text-white/70">
            <span>10 min</span>
            <span>{travelMinutes} min</span>
            <span>45 min</span>
          </div>
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-semibold text-white">Hard dislikes</h2>
        <p className="text-sm text-white/60">We'll actively avoid these in recommendations.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {dislikeOptions.map((option) => (
            <Chip
              key={option}
              variant={dislikes.includes(option) ? 'solid' : 'soft'}
              active={dislikes.includes(option)}
              onClick={() => toggleDislike(option)}
            >
              {option}
            </Chip>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-semibold text-white">Schedule preference</h2>
        <p className="text-sm text-white/60">When you're most likely to do things.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {scheduleOptions.map((option) => (
            <Chip
              key={option.value}
              variant={scheduleBias === option.value ? 'solid' : 'soft'}
              active={scheduleBias === option.value}
              onClick={() => onScheduleBiasChange(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-4">
        <h2 className="text-lg font-semibold text-white">Social preference</h2>
        <p className="text-sm text-white/60">Your preferred crowd size for events.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {socialStyleOptions.map((option) => (
            <Chip
              key={option.value}
              variant={socialStyle === option.value ? 'solid' : 'soft'}
              active={socialStyle === option.value}
              onClick={() => onSocialStyleChange(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </section>
    </div>
  );
}
