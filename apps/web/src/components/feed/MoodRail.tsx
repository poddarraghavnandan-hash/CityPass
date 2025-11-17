import type { IntentionTokens } from '@citypass/types';
import { cn } from '@/lib/utils';

type MoodKey = IntentionTokens['mood'];

const moods: { key: MoodKey; label: string; description: string }[] = [
  { key: 'calm', label: 'Calm', description: 'soft nights' },
  { key: 'social', label: 'Social', description: 'crowds & clubs' },
  { key: 'electric', label: 'Electric', description: 'high energy' },
  { key: 'artistic', label: 'Artistic', description: 'galleries & experimentation' },
  { key: 'grounded', label: 'Grounded', description: 'nature, daytime' },
];

type MoodRailProps = {
  value: MoodKey;
  onChange: (mood: MoodKey) => void;
  onLog?: (mood: MoodKey) => void;
};

export function MoodRail({ value, onChange, onLog }: MoodRailProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {moods.map((mood) => (
        <button
          key={mood.key}
          type="button"
          onClick={() => onChange(mood.key)}
          className={cn(
            'min-w-[150px] rounded-[26px] border px-4 py-3 text-left transition',
            value === mood.key ? 'border-white bg-white/10 text-white' : 'border-white/10 text-white/70 hover:border-white/40'
          )}
          aria-pressed={value === mood.key}
          onMouseUp={() => onLog?.(mood.key)}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">{mood.label}</p>
          <p className="text-xs text-white/60">{mood.description}</p>
        </button>
      ))}
    </div>
  );
}
