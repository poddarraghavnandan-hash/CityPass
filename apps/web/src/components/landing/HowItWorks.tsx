import { NeonCard } from '@/components/ui/NeonCard';
import { GlowBadge } from '@/components/ui/GlowBadge';

const steps = [
  {
    title: 'Best Match',
    time: 'Tonight · 9:00p',
    blurb: 'Tight fit to your mood, distance, and budget.',
  },
  {
    title: 'Wildcard',
    time: 'Late · 11:30p',
    blurb: 'Unexpected, still grounded in your tokens.',
  },
  {
    title: 'Close & Easy',
    time: 'Nearby · 7:00p',
    blurb: 'Low friction picks with fast routes and tickets.',
  },
];

export function HowItWorks() {
  return (
    <section className="space-y-6">
      <div>
        <GlowBadge variant="outline">Flow</GlowBadge>
        <h2 className="mt-3 text-3xl font-semibold text-white">Chat → slates → feed.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {steps.map((step) => (
          <NeonCard key={step.title} interactive>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">{step.title}</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">{step.time}</h3>
            <p className="text-sm text-white/70">{step.blurb}</p>
          </NeonCard>
        ))}
      </div>
    </section>
  );
}
