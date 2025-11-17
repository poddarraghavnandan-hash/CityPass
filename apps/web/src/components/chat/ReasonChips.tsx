type ReasonChipsProps = {
  reasons?: string[];
  onHide?: () => void;
};

export function ReasonChips({ reasons, onHide }: ReasonChipsProps) {
  if (!reasons?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {reasons.slice(0, 4).map((reason) => (
        <span key={reason} className="rounded-full border border-white/20 px-3 py-1 text-white/70">
          {reason}
        </span>
      ))}
      {onHide && (
        <button type="button" onClick={onHide} className="rounded-full border border-white/20 px-3 py-1 text-white/50 hover:border-white/40">
          Not interested
        </button>
      )}
    </div>
  );
}
