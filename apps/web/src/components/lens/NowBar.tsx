'use client';

import { budgetTokens, companionTokens } from '@/theme/lensTheme';
import type { IntentionTokens } from '@citypass/types/lens';

interface NowBarProps {
  tokens: IntentionTokens;
  onUpdate: (updated: Partial<IntentionTokens>) => void;
}

const TIME_WINDOWS = [45, 90, 150, 240];
const DISTANCE_WINDOWS = [2, 5, 8, 12];

export function NowBar({ tokens, onUpdate }: NowBarProps) {
  const cycleTime = () => {
    const idx = TIME_WINDOWS.indexOf(tokens.untilMinutes);
    const next = TIME_WINDOWS[(idx + 1) % TIME_WINDOWS.length];
    onUpdate({ untilMinutes: next });
  };

  const cycleDistance = () => {
    const idx = DISTANCE_WINDOWS.indexOf(tokens.distanceKm);
    const next = DISTANCE_WINDOWS[(idx + 1) % DISTANCE_WINDOWS.length];
    onUpdate({ distanceKm: next });
  };

  const cycleBudget = () => {
    const options: IntentionTokens['budget'][] = ['free', 'casual', 'splurge'];
    const idx = options.indexOf(tokens.budget);
    const next = options[(idx + 1) % options.length];
    onUpdate({ budget: next });
  };

  const toggleCompanion = (companion: IntentionTokens['companions'][number]) => {
    const set = new Set(tokens.companions);
    if (set.has(companion)) {
      set.delete(companion);
    } else {
      set.add(companion);
    }
    const next = Array.from(set);
    onUpdate({ companions: next.length > 0 ? (next as IntentionTokens['companions']) : ['solo'] });
  };

  return (
    <div className="lens-now-bar">
      <div className="rounded-3xl bg-white/5 border border-white/10 px-3 py-2 flex flex-wrap gap-2 items-center">
        <Token label="Until" value={`${tokens.untilMinutes}m`} onClick={cycleTime} />
        <Token label="Radius" value={`${tokens.distanceKm}km`} onClick={cycleDistance} />
        <Token label="Budget" value={budgetTokens[tokens.budget].label} onClick={cycleBudget} />
        <div className="flex gap-2">
          {Object.entries(companionTokens).map(([key, label]) => {
            const active = tokens.companions.includes(key as IntentionTokens['companions'][number]);
            return (
              <button
                key={key}
                className={`lens-token text-xs ${active ? 'bg-white/20 border-white/40' : 'text-white/50'}`}
                onClick={() => toggleCompanion(key as IntentionTokens['companions'][number])}
                aria-pressed={active}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Token({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button className="lens-token" onClick={onClick} aria-label={label}>
      <span className="text-white/50 text-xs">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </button>
  );
}
