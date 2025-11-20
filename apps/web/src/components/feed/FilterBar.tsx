'use client';

import type { IntentionTokens } from '@citypass/types';
import { Chip } from '@/components/ui/Chip';

type MoodOption = {
  label: string;
  value: IntentionTokens['mood'];
};

type FilterBarProps = {
  mood: IntentionTokens['mood'];
  time: 'now' | 'today' | 'tonight' | 'weekend';
  distance: 'walkable' | 'short' | 'open';
  onMoodChange: (value: IntentionTokens['mood']) => void;
  onTimeChange: (value: 'now' | 'today' | 'tonight' | 'weekend') => void;
  onDistanceChange: (value: 'walkable' | 'short' | 'open') => void;
};

const moodOptions: MoodOption[] = [
  { label: 'Chill', value: 'calm' },
  { label: 'Active', value: 'electric' },
  { label: 'Social', value: 'social' },
  { label: 'Creative', value: 'artistic' },
];

const timeOptions: Array<{ label: string; value: FilterBarProps['time'] }> = [
  { label: 'Now', value: 'now' },
  { label: 'Today', value: 'today' },
  { label: 'Tonight', value: 'tonight' },
  { label: 'This weekend', value: 'weekend' },
];

const distanceOptions: Array<{ label: string; value: FilterBarProps['distance'] }> = [
  { label: 'Walkable', value: 'walkable' },
  { label: 'Short ride', value: 'short' },
  { label: 'Open to travel', value: 'open' },
];

export function FilterBar({ mood, time, distance, onMoodChange, onTimeChange, onDistanceChange }: FilterBarProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-[#0B111D]/80 p-4 shadow-[0_15px_50px_rgba(5,5,12,0.5)]">
      <FilterGroup label="Mood" options={moodOptions} activeValue={mood} onSelect={onMoodChange} />
      <FilterGroup label="Time" options={timeOptions} activeValue={time} onSelect={onTimeChange} />
      <FilterGroup label="Distance" options={distanceOptions} activeValue={distance} onSelect={onDistanceChange} />
    </div>
  );
}

type FilterGroupProps<T extends string> = {
  label: string;
  options: Array<{ label: string; value: T }>;
  activeValue: T;
  onSelect: (value: T) => void;
};

function FilterGroup<T extends string>({ label, options, activeValue, onSelect }: FilterGroupProps<T>) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option.value}
            variant={activeValue === option.value ? 'solid' : 'soft'}
            active={activeValue === option.value}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}
