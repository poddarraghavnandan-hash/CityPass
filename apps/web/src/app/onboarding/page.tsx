import { PageShell } from '@/components/layout/PageShell';
import { Steps } from '@/components/onboarding/Steps';

export const metadata = {
  title: 'CityLens Onboarding',
};

export default function OnboardingPage() {
  return (
    <PageShell>
      <Steps />
    </PageShell>
  );
}
