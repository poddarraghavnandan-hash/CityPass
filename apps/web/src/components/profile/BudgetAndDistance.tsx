type BudgetAndDistanceProps = {
  budget: string;
  onBudgetChange: (value: string) => void;
  distanceKm: number;
  onDistanceChange: (value: number) => void;
};

const budgets = ['free', 'casual', 'splurge'];

export function BudgetAndDistance({ budget, onBudgetChange, distanceKm, onDistanceChange }: BudgetAndDistanceProps) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-6 text-white">
      <p className="text-xs uppercase tracking-[0.5em] text-white/40">Logistics</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm text-white/60">Travel radius</p>
          <input
            type="range"
            min={1}
            max={20}
            value={distanceKm}
            onChange={(event) => onDistanceChange(Number(event.target.value))}
            className="w-full accent-white"
          />
          <p className="mt-2 text-sm text-white/70">{distanceKm} km</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-white/60">Budget</p>
          <div className="flex flex-wrap gap-2">
            {budgets.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => onBudgetChange(tier)}
                className={`rounded-full border px-4 py-2 text-sm capitalize ${
                  budget === tier ? 'border-white bg-white text-black' : 'border-white/10 text-white/70 hover:border-white/40'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
