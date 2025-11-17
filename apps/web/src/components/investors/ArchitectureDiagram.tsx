export function ArchitectureDiagram() {
  return (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 text-white/80">
      <p className="text-xs uppercase tracking-[0.5em] text-white/40">Architecture</p>
      <p className="mt-2 text-sm text-white/70">
        Client → Ask/Plan → Slate Builder → Feed (Lens) → Context Modal. All share the same neon design tokens and
        animation language to keep the experience consistent.
      </p>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">1. Ask/Plan API (LLM)</div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">2. Slate builder (Zod + ranking)</div>
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">3. Feed virtualization + context modal</div>
      </div>
    </div>
  );
}
