import { PageShell } from '@/components/layout/PageShell';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { OnboardingExperience } from '@/components/onboarding/OnboardingExperience';

export const metadata = {
  title: 'CityLens Onboarding',
};

export default function OnboardingPage() {
  return (
    <PageShell>
      <div className="space-y-8">
        <SectionTitle
          eyebrow="Taste onboarding"
          title="Hi there. What are you in the mood for?"
          description="Tap through the three quick steps to ground your taste before entering chat."
        />
        <OnboardingExperience />
      </div>
    </PageShell>
  );
}
