export function SkeletonStoryCard() {
  return (
    <div className="animate-pulse rounded-[36px] border border-white/5 bg-white/5 p-4">
      <div className="aspect-[3/4] rounded-[28px] bg-white/10" />
      <div className="mt-4 space-y-3">
        <div className="h-3 rounded-full bg-white/10" />
        <div className="h-5 rounded-full bg-white/20" />
        <div className="h-3 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
