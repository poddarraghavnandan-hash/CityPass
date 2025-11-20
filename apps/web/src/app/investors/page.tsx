import { PageShell } from '@/components/layout/PageShell';
import { InvestorPage } from '@/components/investors/InvestorPage';

export const metadata = {
  title: 'CityLens · Investor Preview',
};

export default function InvestorsPage() {
  return (
    <PageShell>
      <InvestorPage />
    </PageShell>
  );
}
