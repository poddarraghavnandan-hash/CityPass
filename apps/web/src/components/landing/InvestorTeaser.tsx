import Link from 'next/link';
import { NeonCard } from '@/components/ui/NeonCard';
import { GlowBadge } from '@/components/ui/GlowBadge';
import { Button } from '@/components/ui/button';

export function InvestorTeaser() {
  return (
    <section className="space-y-4">
      <GlowBadge variant="outline">For investors</GlowBadge>
      <NeonCard className="grid gap-6 md:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-white">Dark neon demo, ready to launch.</h3>
          <p className="text-sm text-white/70">Architecture, metrics, and story feed in one place.</p>
          <Button asChild className="rounded-full bg-white text-black hover:bg-white/80">
            <Link href="/investors">Open investor view</Link>
          </Button>
        </div>
        <div className="rounded-3xl border border-white/10 bg-black/40 p-4">
          <img src="/mockups/dark-neon.png" alt="Investor teaser" className="h-full w-full rounded-2xl object-cover" />
        </div>
      </NeonCard>
    </section>
  );
}
