import { PageShell } from '@/components/layout/PageShell';
import { Hero } from '@/components/landing/Hero';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { TastePreview } from '@/components/landing/TastePreview';
import { InvestorTeaser } from '@/components/landing/InvestorTeaser';

export default function LandingPage() {
  return (
    <PageShell>
      <div className=\"space-y-14 py-10\">
        <Hero />
        <HowItWorks />
        <TastePreview />
        <InvestorTeaser />
      </div>
    </PageShell>
  );
}
