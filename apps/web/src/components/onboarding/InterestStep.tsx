const tags = ['Sound', 'Movement', 'Social', 'Arts', 'Nature', 'Educational', 'Nightlife'];

type InterestStepProps = {
  values: string[];
  onToggle: (value: string) => void;
};

export function InterestStep({ values, onToggle }: InterestStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm uppercase tracking-[0.5em] text-white/40">Interests</p>
      <div className="flex flex-wrap gap-3">
        {tags.map((tag) => {
          const active = values.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={`rounded-full border px-6 py-2 text-sm transition ${
                active ? 'border-white bg-white text-black' : 'border-white/10 text-white/70 hover:border-white/40'
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
