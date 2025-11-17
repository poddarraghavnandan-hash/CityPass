type ReasonChipsProps = {
  reasons?: string[];
};

export function ReasonChips({ reasons }: ReasonChipsProps) {
  if (!reasons?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {reasons.slice(0, 4).map((reason) => (
        <span key={reason} className="rounded-full border border-white/20 px-3 py-1 text-white/70">
          {reason}
        </span>
      ))}
    </div>
  );
}
