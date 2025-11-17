import { GlowBadge } from '@/components/ui/GlowBadge';

export function InvestorStory() {
  return (
    <div className="space-y-4 rounded-[32px] border border-white/10 bg-white/5 p-8 text-white">
      <GlowBadge>Investor briefing</GlowBadge>
      <h2 className="text-3xl font-semibold">We found your night out.</h2>
      <p className="text-sm text-white/70">
        CityLens is a chat-native feed for cities. We stitch intents into neon slates, reference ops-grade data, and
        ship a cinematic consumer UI that demos well in 60 seconds.
      </p>
      <ul className="list-disc space-y-2 pl-4 text-sm text-white/70">
        <li>Voice + text copilot</li>
        <li>Story feed with live social embeds</li>
        <li>Taste graph that updates every interaction</li>
      </ul>
    </div>
  );
}
