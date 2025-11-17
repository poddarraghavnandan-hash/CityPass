import type { IntentionTokens } from '@citypass/types';

type MoodKey = IntentionTokens['mood'];

const moods: { key: MoodKey; label: string; description: string }[] = [
  { key: 'electric', label: 'Nightlife', description: 'Clubs, synths, late energy' },
  { key: 'social', label: 'Social', description: 'Crowds, collaboration, buzz' },
  { key: 'artistic', label: 'Arts', description: 'Museums, experimental, galleries' },
  { key: 'calm', label: 'Chill', description: 'Mindful, cozy, analog' },
  { key: 'grounded', label: 'Nature', description: 'Sunlight, water, grounded' },
];

type MoodStepProps = {
  value: MoodKey;
  onChange: (value: MoodKey) => void;
};

export function MoodStep({ value, onChange }: MoodStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm uppercase tracking-[0.5em] text-white/40">Mood</p>
      <div className="grid gap-3 md:grid-cols-2">
        {moods.map((mood) => (
          <button
            key={mood.key}
            type="button"
            onClick={() => onChange(mood.key)}
            className={`rounded-[32px] border px-6 py-5 text-left transition ${
              value === mood.key ? 'border-white bg-white/10 text-white' : 'border-white/10 text-white/70 hover:border-white/40'
            }`}
          >
            <p className="text-xl font-semibold">{mood.label}</p>
            <p className="text-sm text-white/60">{mood.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
