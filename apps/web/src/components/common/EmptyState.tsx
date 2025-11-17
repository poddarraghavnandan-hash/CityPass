type EmptyStateProps = {
  title?: string;
  description?: string;
  emoji?: string;
};

export function EmptyState({
  title = 'Nothing surfaced',
  description = 'The city is quiet for this exact mix. Broaden your filters or try a new vibe.',
  emoji = '🌌',
}: EmptyStateProps) {
  return (
    <div className="rounded-[30px] border border-dashed border-white/20 bg-white/5 p-10 text-center text-white/80">
      <div className="text-4xl">{emoji}</div>
      <p className="mt-4 text-xl font-medium text-white">{title}</p>
      <p className="text-sm text-white/60">{description}</p>
    </div>
  );
}
