import { useMemo } from 'react';
import { cn } from '@/lib/utils';

type FilterBarProps = {
  distanceKm: number;
  onDistanceChange: (value: number) => void;
  budget: 'free' | 'casual' | 'splurge';
  onBudgetChange: (value: 'free' | 'casual' | 'splurge') => void;
  timeWindow: string;
  onTimeWindowChange: (value: string) => void;
};

const timeOptions = ['now', 'tonight', 'this weekend'];

export function FilterBar({ distanceKm, onDistanceChange, budget, onBudgetChange, timeWindow, onTimeWindowChange }: FilterBarProps) {
  const budgetOptions = useMemo(() => ['free', 'casual', 'splurge'] as const, []);

  return (
    <div className="flex flex-col gap-4 rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-white/80 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">City · New York</span>
        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-white/60">Radius</span>
          <input
            type="range"
            min={1}
            max={20}
            value={distanceKm}
            onChange={(event) => onDistanceChange(Number(event.target.value))}
            className="accent-white"
          />
          <span className="text-white/70">{distanceKm} km</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-white/10 bg-black/30 p-1 text-xs">
          {budgetOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onBudgetChange(option)}
              className={cn(
                'rounded-full px-3 py-1 capitalize transition',
                budget === option ? 'bg-white text-black' : 'text-white/70'
              )}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="flex rounded-full border border-white/10 bg-black/30 p-1 text-xs">
          {timeOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onTimeWindowChange(option)}
              className={cn(
                'rounded-full px-3 py-1 capitalize transition',
                timeWindow === option ? 'bg-white text-black' : 'text-white/70'
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
