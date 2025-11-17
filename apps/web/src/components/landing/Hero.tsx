import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GlowBadge } from '@/components/ui/GlowBadge';
import { cn } from '@/lib/utils';

const examplePrompts = [
  'Strenuous near Midtown at 6pm',
  'Eclectic music in Brooklyn with friends',
  'Sunset hike then analog synths',
];

type HeroProps = {
  onAsk?: (prompt: string) => void;
};

export function Hero({ onAsk }: HeroProps) {
  return (
    <section className="hero-grid relative overflow-hidden rounded-[45px] border border-white/10 bg-gradient-to-b from-white/10 via-transparent to-black/40 p-10 shadow-[0_30px_140px_rgba(0,0,0,0.85)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(77,123,255,0.25),transparent_40%),_radial-gradient(circle_at_80%_0%,rgba(244,91,255,0.2),transparent_35%)]" />
      <GlowBadge>Dark Neon Preview</GlowBadge>
      <div className="mt-6 grid gap-10 md:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-6">
          <h1 className="text-5xl font-semibold leading-tight text-white">CityLens · cinematic nights on demand.</h1>
          <p className="text-lg text-white/70">
            Tell us the vibe. We stream back a plan, three slates, and a feed you can explore instantly.
          </p>
          <ChatLikeInput onAsk={onAsk} />
          <div className="flex flex-wrap gap-3">
            <Button asChild className="rounded-full bg-white text-black hover:bg-white/80">
              <Link href="/chat">Ask CityLens</Link>
            </Button>
            <Button asChild variant="ghost" className="rounded-full border border-white/20 text-white hover:bg-white/10">
              <Link href="/feed">Open story feed</Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-6 rounded-[50px] bg-gradient-to-br from-blue-600/20 via-transparent to-pink-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-black/60">
            <img src="/mockups/dark-neon.png" alt="Dark neon mockups" className="h-full w-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}

type ChatLikeInputProps = {
  onAsk?: (prompt: string) => void;
};

function ChatLikeInput({ onAsk }: ChatLikeInputProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-[30px] border border-white/10 bg-black/40 p-4 text-white shadow-[0_15px_80px_rgba(5,5,30,0.6)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="text"
            placeholder="Tell me what kind of night you’re in the mood for…"
            className="flex-1 rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const value = (event.target as HTMLInputElement).value;
                if (value && onAsk) onAsk(value);
              }
            }}
          />
          <Button className="rounded-full bg-white text-black hover:bg-white/90" onClick={() => {}}>
            Ask CityLens
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-white/60">
        {examplePrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onAsk?.(prompt)}
            className={cn('rounded-full border border-white/15 px-3 py-1 transition hover:border-white/40 hover:text-white')}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
