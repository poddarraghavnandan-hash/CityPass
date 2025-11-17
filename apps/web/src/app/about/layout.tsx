import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About CityPass',
  description:
    'Learn how CityPass uses AI to help you discover the perfect events in your city. From concert halls to comedy clubs, we match you with experiences that fit your mood and preferences.',
  openGraph: {
    title: 'About CityPass - AI-Powered Event Discovery',
    description:
      'Learn how CityPass uses AI to help you discover the perfect events in your city. From concert halls to comedy clubs, we match you with experiences that fit your mood and preferences.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About CityPass - AI-Powered Event Discovery',
    description:
      'Learn how CityPass uses AI to help you discover the perfect events in your city. From concert halls to comedy clubs, we match you with experiences that fit your mood and preferences.',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
