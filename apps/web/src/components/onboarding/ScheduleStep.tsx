type ScheduleStepProps = {
  distanceKm: number;
  onDistanceChange: (value: number) => void;
  budget: string;
  onBudgetChange: (value: string) => void;
};

const budgets = ['free', 'casual', 'splurge'];

export function ScheduleStep({ distanceKm, onDistanceChange, budget, onBudgetChange }: ScheduleStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm uppercase tracking-[0.5em] text-white/40">Radius & budget</p>
      <div className="rounded-[32px] border border-white/10 bg-black/20 p-6 text-white">
        <label className="flex flex-col gap-2 text-sm text-white/60">
          Distance {distanceKm} km
          <input
            type="range"
            min={1}
            max={20}
            value={distanceKm}
            onChange={(event) => onDistanceChange(Number(event.target.value))}
            className="w-full accent-white"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          {budgets.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onBudgetChange(tier)}
              className={`rounded-full border px-5 py-2 text-sm capitalize ${
                tier === budget ? 'border-white bg-white text-black' : 'border-white/10 text-white/70 hover:border-white/40'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
