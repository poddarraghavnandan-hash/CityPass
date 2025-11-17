type NowBarProps = {
  city: string;
  tokens: {
    distanceKm: number;
    budget: string;
    untilMinutes: number;
  };
  onAdjust?: () => void;
};

export function NowBar({ city, tokens, onAdjust }: NowBarProps) {
  const untilHours = Math.round(tokens.untilMinutes / 60);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-white/15 bg-white/5 px-6 py-4 text-sm text-white/70">
      <div className="flex flex-wrap gap-6">
        <span>City · {city}</span>
        <span>Radius · {tokens.distanceKm}km</span>
        <span>Budget · {tokens.budget}</span>
        <span>Window · next {untilHours}h</span>
      </div>
      {onAdjust && (
        <button type="button" className="text-white hover:text-white/70" onClick={onAdjust}>
          Adjust
        </button>
      )}
    </div>
  );
}
