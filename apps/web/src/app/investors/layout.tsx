import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Investors',
  description:
    'CityPass is revolutionizing event discovery with AI-powered personalization. Learn about our CAG+RAG architecture, traction metrics, and vision for the future of urban entertainment.',
  openGraph: {
    title: 'CityPass - Investor Information',
    description:
      'CityPass is revolutionizing event discovery with AI-powered personalization. Learn about our CAG+RAG architecture, traction metrics, and vision for the future of urban entertainment.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CityPass - Investor Information',
    description:
      'CityPass is revolutionizing event discovery with AI-powered personalization. Learn about our CAG+RAG architecture, traction metrics, and vision for the future of urban entertainment.',
  },
  robots: {
    index: false, // Don't index investor page
    follow: true,
  },
};

export default function InvestorsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
