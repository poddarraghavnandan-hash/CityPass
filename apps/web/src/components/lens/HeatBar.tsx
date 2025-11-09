'use client';

interface HeatBarProps {
  value: number;
  label?: string;
}

export function HeatBar({ value, label = 'Social heat' }: HeatBarProps) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div>
      <div className="flex items-center justify-between text-xs uppercase text-white/60 tracking-[0.25em] mb-1">
        <span>{label}</span>
        <span>{Math.round(clamped * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-orange-400"
          style={{ width: `${clamped * 100}%` }}
        />
      </div>
    </div>
  );
}
