import { NeonCard } from '@/components/ui/NeonCard';

export function TastePreview() {
  return (
    <section className="grid gap-6 rounded-[40px] border border-white/10 bg-white/5 p-8 md:grid-cols-[1.4fr,0.6fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">Taste graph</p>
        <h3 className="mt-2 text-3xl font-semibold text-white">We scan your orbit.</h3>
        <p className="text-sm text-white/60">Movement, music, social energy, arts, nature—all in one neon orb.</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/70">
          {['Active', 'Social', 'Arts', 'Nightlife', 'Chill', 'Educational'].map((tag) => (
            <span key={tag} className="rounded-full border border-white/15 px-4 py-2">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <NeonCard>
        <p className="text-xs uppercase tracking-[0.4em] text-white/50">Profile preview</p>
        <p className="mt-4 text-4xl font-semibold text-white">89%</p>
        <p className="text-sm text-white/70">aligned with “Night Bloom” archetype</p>
        <div className="mt-4 h-40 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/20 via-transparent to-pink-500/20" />
      </NeonCard>
    </section>
  );
}
