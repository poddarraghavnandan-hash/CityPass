const metrics = [
  { label: 'Retention v0', value: '54%', caption: 'Day 7 across pilot cohort' },
  { label: 'Slate CTR', value: '31%', caption: 'Tap-through on story cards' },
  { label: 'AHT', value: '2.3s', caption: 'Ask → slate response' },
];

export function MetricTiles() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-3xl border border-white/10 bg-black/40 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">{metric.label}</p>
          <p className="text-3xl font-semibold">{metric.value}</p>
          <p className="text-xs text-white/60">{metric.caption}</p>
        </div>
      ))}
    </div>
  );
}
