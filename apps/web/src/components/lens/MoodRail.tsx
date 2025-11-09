'use client';

import { motion } from 'framer-motion';
import { moodPalette, type MoodKey } from '@/theme/lensTheme';

interface MoodRailProps {
  value: MoodKey;
  onChange: (mood: MoodKey) => void;
}

const MOOD_ORDER: MoodKey[] = ['calm', 'social', 'electric', 'artistic', 'grounded'];

export function MoodRail({ value, onChange }: MoodRailProps) {
  return (
    <div
      className="px-4 pt-6 pb-3 sticky top-0 z-20 lens-rail"
      role="tablist"
      aria-label="Choose your vibe"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">CityLens</p>
          <h1 className="text-2xl font-semibold text-white">
            {moodPalette[value].name} tonight
          </h1>
        </div>
        <a
          href="/feed/classic"
          className="text-sm text-white/70 underline-offset-4 hover:text-white"
        >
          Back to Classic
        </a>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {MOOD_ORDER.map((mood) => {
          const theme = moodPalette[mood];
          const isActive = mood === value;
          return (
            <motion.button
              key={mood}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(mood)}
              className={`px-4 py-3 rounded-full text-sm font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/80 focus-visible:outline-none ${
                isActive ? 'text-black shadow-lg' : 'text-white/70 border border-white/10'
              }`}
              style={
                isActive
                  ? {
                      background:
                        'linear-gradient(120deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))',
                      color: '#05060f',
                    }
                  : undefined
              }
            >
              {theme.name}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
