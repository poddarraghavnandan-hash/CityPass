import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPinned, MessageSquareText, Sparkles } from 'lucide-react';

const bullets = [
  {
    title: 'What CityLens is',
    copy: 'An AI concierge that listens to free-text feelings and spins up verifiable plans to do right now.',
  },
  {
    title: 'Why now',
    copy: 'Cities are reopening with fragmented discovery; residents expect a single link that feels human and fast.',
  },
  {
    title: 'How we win',
    copy: 'Unified tokens power chat, feed, memory, and ops—so every UI stays in sync while we scale to new cities.',
  },
];

const timeline = [
  {
    title: 'Ask anything',
    description: 'User describes a vibe—not just “tonight.” CityLens interprets mood, budget, travel tolerance.',
    icon: MessageSquareText,
  },
  {
    title: 'Agent + search',
    description: 'We blend live inventory with operator overrides and taste memory, returning clear slates.',
    icon: MapPinned,
  },
  {
    title: 'Stories & learning',
    description: 'Cards hit chat, feed, and investors deck. Feedback loops feed the taste graph in real time.',
    icon: Sparkles,
  },
];

export function InvestorPage() {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-y-auto text-white">
      <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Investor brief</p>
          <h1 className="text-3xl font-semibold">CityLens is the intuitive UI for doing things in your city.</h1>
          <p className="text-sm text-white/70">One surface for asking, browsing, saving, and showing. Minimal chrome, maximum clarity.</p>
          <ul className="space-y-3">
            {bullets.map((bullet) => (
              <li key={bullet.title} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-semibold">{bullet.title}</p>
                <p className="text-sm text-white/70">{bullet.copy}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="inline-flex items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#050509]"
            >
              Open live demo <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="mailto:founders@citypass.ai" className="inline-flex items-center rounded-full border border-white/20 px-5 py-2 text-sm">
              Request deck
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          <PreviewCard title="Chat concierge" description="Header + slates + sticky input—all with a single scroll.">
            <div className="rounded-2xl border border-white/10 bg-[#0D101A] p-4 text-sm text-white/80">
              <div className="text-xs uppercase tracking-[0.3em] text-white/40">CityLens</div>
              <p className="mt-2 text-sm text-white">“Tell me what you feel like doing. I’ll return real places with context and actions.”</p>
              <div className="mt-3 space-y-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <p className="text-xs text-white/60">Best matches</p>
                  <p>Sunset sculpture walk · Today · Brooklyn</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                  <p className="text-xs text-white/60">Close & easy</p>
                  <p>Espresso bar with quiet wifi · Now · Soho</p>
                </div>
              </div>
              <div className="mt-3 rounded-full border border-white/10 bg-white text-center text-xs font-semibold text-[#050509] py-2">Ask CityLens</div>
            </div>
          </PreviewCard>
          <PreviewCard title="Feed extension" description="Same cards render in feed with chips + filters. No redesign needed.">
            <div className="space-y-3 text-sm text-white/80">
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                <p className="text-xs text-white/60">Mood</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {['Chill', 'Active', 'Creative', 'Social'].map((label) => (
                    <span key={label} className="rounded-full border border-white/10 px-3 py-1 text-xs">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-sm font-semibold text-white">Gallery crawl in Tribeca</p>
                  <p className="text-xs text-white/60">Tonight · Tribeca · Artsy · $$</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <p className="text-sm font-semibold text-white">Sunrise mobility club</p>
                  <p className="text-xs text-white/60">Tomorrow · Williamsburg · Sweat · $</p>
                </div>
              </div>
            </div>
          </PreviewCard>
        </div>
      </div>
      <div className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">How it works</h2>
          <Link href="/chat" className="text-sm text-teal-200 hover:underline">
            See it live
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {timeline.map((item) => (
            <div key={item.title} className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <item.icon className="h-4 w-4 text-teal-200" />
              </div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-sm text-white/70">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type PreviewCardProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function PreviewCard({ title, description, children }: PreviewCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#04070d]/80 p-5 shadow-[0_25px_60px_rgba(5,5,12,0.5)]">
      <div className="mb-3 space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-white/60">{description}</p>
      </div>
      {children}
    </div>
  );
}
