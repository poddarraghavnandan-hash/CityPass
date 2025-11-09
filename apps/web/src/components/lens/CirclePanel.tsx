'use client';

interface CirclePanelProps {
  companions: string[];
}

const circleOptions = [
  { id: 'solo', label: 'Solo flow', status: 'Free tonight' },
  { id: 'partner', label: 'Bring a partner', status: 'Check in' },
  { id: 'crew', label: 'Crew night', status: '3 interested' },
  { id: 'family', label: 'Family time', status: 'Kids welcome' },
];

export function CirclePanel({ companions }: CirclePanelProps) {
  return (
    <div className="rounded-3xl border border-white/10 p-4 bg-white/5 space-y-3">
      <h3 className="text-lg font-semibold">Circles</h3>
      <ul className="space-y-2">
        {circleOptions.map((option) => {
          const active = companions.includes(option.id);
          return (
            <li
              key={option.id}
              className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm ${
                active ? 'bg-white/15' : 'text-white/60'
              }`}
            >
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-xs text-white/50">{option.status}</p>
              </div>
              {active && <span className="text-xs px-2 py-1 rounded-full bg-white/20">Now</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
