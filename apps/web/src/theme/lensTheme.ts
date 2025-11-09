export const moodPalette = {
  calm: {
    name: 'Calm',
    gradient: 'from-sky-300 via-indigo-400 to-slate-900',
    accent: '#8FB7FF',
    glow: '0 20px 60px rgba(92, 118, 255, 0.35)',
  },
  social: {
    name: 'Social',
    gradient: 'from-rose-400 via-orange-400 to-red-500',
    accent: '#FFAD7A',
    glow: '0 20px 60px rgba(255, 173, 122, 0.35)',
  },
  electric: {
    name: 'Electric',
    gradient: 'from-fuchsia-500 via-purple-500 to-blue-500',
    accent: '#D67BFF',
    glow: '0 30px 70px rgba(214, 123, 255, 0.55)',
  },
  artistic: {
    name: 'Artistic',
    gradient: 'from-amber-200 via-pink-300 to-indigo-400',
    accent: '#F7D3A3',
    glow: '0 20px 60px rgba(247, 211, 163, 0.45)',
  },
  grounded: {
    name: 'Grounded',
    gradient: 'from-emerald-300 via-lime-200 to-stone-200',
    accent: '#7ADFAA',
    glow: '0 20px 60px rgba(122, 223, 170, 0.45)',
  },
} as const;

export type MoodKey = keyof typeof moodPalette;

export const budgetTokens = {
  free: { label: 'Free', caption: 'Zero-cost gems' },
  casual: { label: 'Casual', caption: 'Up to $75' },
  splurge: { label: 'Splurge', caption: 'Make it special' },
};

export const companionTokens = {
  solo: 'Solo flow',
  partner: 'With a partner',
  crew: 'Crew night',
  family: 'Family-friendly',
};

export function getMoodTheme(mood: MoodKey = 'calm') {
  return moodPalette[mood];
}
