import { PageShell } from '@/components/layout/PageShell';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { GlowBadge } from '@/components/ui/GlowBadge';
import { NeonCard } from '@/components/ui/NeonCard';
import { InvestorStory } from '@/components/investors/Story';
import { ArchitectureDiagram } from '@/components/investors/ArchitectureDiagram';
import { MetricTiles } from '@/components/investors/MetricTiles';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'CityLens · Investor Preview',
};

export default function InvestorsPage() {
  return (
    <PageShell>
      <div className="space-y-12">
        <section className="grid gap-10 rounded-[40px] border border-white/10 bg-gradient-to-br from-white/10 via-transparent to-black/40 p-10 md:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <GlowBadge>Investor Preview</GlowBadge>
            <h1 className="text-5xl font-semibold leading-tight text-white">CityLens is a dark neon chat feed.</h1>
            <p className="text-base text-white/70">
              One stack powers chat, feed, and context modal. We keep motion calm, typography editorial, and surfaces minimal.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/chat" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black hover:bg-white/80">
                Launch demo
              </Link>
              <Link
                href="mailto:founders@citypass.ai"
                className="rounded-full border border-white/20 px-6 py-3 text-sm text-white hover:bg-white/10"
              >
                Request deck
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-blue-600/20 via-transparent to-pink-500/20 blur-3xl" />
            <Image
              src="/mockups/dark-neon.png"
              alt="Dark neon UI preview"
              width={900}
              height={1400}
              className="relative h-auto w-full rounded-[36px] border border-white/10 object-cover"
              priority
            />
          </div>
        </section>

        <SectionTitle eyebrow="Why now" title="A cinematic UI that hides a serious stack" />
        <div className="grid gap-6 md:grid-cols-3">
          <NeonCard>
            <h3 className="text-2xl font-semibold text-white">LLM + ops fuse</h3>
            <p className="text-sm text-white/70">Ask/Plan streams, operator overrides, and feed visuals share the same token set.</p>
          </NeonCard>
          <NeonCard>
            <h3 className="text-2xl font-semibold text-white">Story-first</h3>
            <p className="text-sm text-white/70">Every recommendation becomes a slate and a story card—reusable across surfaces.</p>
          </NeonCard>
          <NeonCard>
            <h3 className="text-2xl font-semibold text-white">Demo-ready</h3>
            <p className="text-sm text-white/70">We tuned for investor demos: guard rails, low CLS, calm animations.</p>
          </NeonCard>
        </div>

        <InvestorStory />
        <ArchitectureDiagram />
        <MetricTiles />
      </div>
    </PageShell>
  );
}
