'use client';

import { useMemo } from 'react';

type TasteGraphProps = {
  scores?: {
    music?: number;
    movement?: number;
    social?: number;
    arts?: number;
    nature?: number;
  };
};

export function TasteGraph({ scores }: TasteGraphProps) {
  const points = useMemo(() => {
    const entries = [
      { key: 'music', angle: 90 },
      { key: 'movement', angle: 18 },
      { key: 'social', angle: -54 },
      { key: 'arts', angle: -126 },
      { key: 'nature', angle: 162 },
    ] as const;
    const radius = 80;
    return entries
      .map((entry) => {
        const score = (scores?.[entry.key] ?? 0.6) * radius;
        const rad = (entry.angle * Math.PI) / 180;
        const x = 100 + score * Math.cos(rad);
        const y = 100 - score * Math.sin(rad);
        return `${x},${y}`;
      })
      .join(' ');
  }, [scores]);

  return (
    <svg viewBox="0 0 200 200" className="w-full">
      <g stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none">
        <polygon points="100,20 180,100 100,180 20,100" />
      </g>
      <polygon points="100,0 200,100 100,200 0,100 100,0" fill="rgba(77,123,255,0.08)" />
      <polygon points={points} fill="rgba(77,123,255,0.35)" stroke="rgba(77,123,255,0.7)" strokeWidth="2" />
    </svg>
  );
}
