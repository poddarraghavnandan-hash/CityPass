import Image from 'next/image';
import Link from 'next/link';
import { PageShell } from '@/components/layout/PageShell';
import { GlowBadge } from '@/components/ui/GlowBadge';
import { NeonCard } from '@/components/ui/NeonCard';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { Button } from '@/components/ui/button';

const heroHighlights = [
  { label: 'Story Feed', value: 'CityLens', copy: 'Neon slates streamed live' },
  { label: 'Latency', value: '2.3s', copy: 'Plan + slate response time' },
  { label: 'Cities indexed', value: '8', copy: 'Coast-to-coast pilots' },
];

const tasteTags = ['Active', 'Social', 'Arts', 'Nightlife', 'Chill', 'Educational'];

const slatePreview = [
  {
    title: 'Sound Bath in Tribeca',
    time: '9:00 PM · Tonight',
    vibe: 'Best Match',
  },
  {
    title: 'EDM Shadows',
    time: '11:30 PM · Wildcard',
    vibe: 'Wildcard',
  },
  {
    title: 'Analog Synth Bloom',
    time: '6:30 PM · Close & Easy',
    vibe: 'Close & Easy',
  },
];

const investorTiles = [
  { title: 'Realtime graph', description: 'Taste graph updates after every chat, feed click, and on-the-ground check in.' },
  { title: 'Human-in-the-loop', description: 'Operators can inject intel straight into the slate builder.' },
  { title: 'Canvas components', description: 'Cards, rails, modals all share neon tokens for faster iteration.' },
];

export default function LandingPage() {
  return (
    <PageShell>
      <div className="space-y-16 py-10">
        <section className="hero-grid overflow-hidden rounded-[45px] border border-white/10 bg-gradient-to-b from-white/10 via-transparent to-black/30 p-10 shadow-[0_30px_140px_rgba(0,0,0,0.85)]">
          <GlowBadge>Dark Neon Preview</GlowBadge>
          <div className="mt-6 grid gap-10 md:grid-cols-2">
            <div className="space-y-6">
              <h1 className="text-5xl font-semibold leading-tight text-white">CityLens · cinematic nights on demand.</h1>
              <p className="text-lg text-white/70">
                The chat-first copilot that scans the entire city, writes a plan, and renders immersive slates powered by
                our story feed.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button asChild className="rounded-full bg-white text-black hover:bg-white/80">
                  <Link href="/chat">Start chatting</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full border border-white/20 text-white hover:bg-white/10">
                  <Link href="/feed">Open feed</Link>
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {heroHighlights.map((highlight) => (
                  <div key={highlight.label} className="rounded-3xl border border-white/5 bg-black/30 p-4">
                    <p className="text-xs uppercase tracking-[0.5em] text-white/40">{highlight.label}</p>
                    <p className="text-2xl font-semibold text-white">{highlight.value}</p>
                    <p className="text-xs text-white/50">{highlight.copy}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 rounded-[50px] bg-gradient-to-br from-blue-600/20 via-transparent to-pink-500/20 blur-3xl" />
              <Image
                src="/mockups/dark-neon.png"
                alt="Dark neon mockups"
                width={900}
                height={1400}
                className="relative h-auto w-full rounded-[40px] border border-white/10 object-cover"
                priority
              />
            </div>
          </div>
        </section>

        <section className="space-y-10">
          <SectionTitle
            eyebrow="How it works"
            title="Chat, receive slates, drop into the feed"
            description="One real-time stack runs every surface so we never break the illusion."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {slatePreview.map((slate) => (
              <NeonCard key={slate.title} interactive>
                <p className="text-xs uppercase tracking-[0.5em] text-white/40">{slate.vibe}</p>
                <h3 className="mt-3 text-2xl font-semibold">{slate.title}</h3>
                <p className="text-sm text-white/60">{slate.time}</p>
              </NeonCard>
            ))}
          </div>
        </section>

        <section className="grid gap-10 rounded-[40px] border border-white/5 bg-white/5 p-10 md:grid-cols-[2fr,1fr]">
          <div>
            <SectionTitle
              eyebrow="Taste graph"
              title="We scan your orbit"
              description="Every tap shapes an orb—movement, music, social energy, arts, nature."
            />
            <div className="mt-6 flex flex-wrap gap-3">
              {tasteTags.map((tag) => (
                <span key={tag} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-[30px] border border-white/10 bg-black/40 p-6 text-center">
            <p className="text-sm uppercase tracking-[0.5em] text-white/40">Profile preview</p>
            <p className="mt-4 text-4xl font-semibold text-white">89%</p>
            <p className="text-sm text-white/70">aligned with “Night Bloom” archetype</p>
          </div>
        </section>

        <section className="space-y-6">
          <SectionTitle
            eyebrow="For investors"
            title="This is what replaces static chat demos"
            description="The same design language powers onboarding, taste graph, and the investor slate."
          />
          <div className="grid gap-6 md:grid-cols-3">
            {investorTiles.map((tile) => (
              <NeonCard key={tile.title}>
                <h3 className="text-2xl font-semibold text-white">{tile.title}</h3>
                <p className="mt-2 text-sm text-white/70">{tile.description}</p>
              </NeonCard>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
