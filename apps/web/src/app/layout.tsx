import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ConsentBanner } from '@/components/ConsentBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CityPass - Discover Events in Your City',
  description: 'Find music, comedy, theatre, and more events happening now',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        {/* Temporarily disabled - not working properly */}
        {/* <ConsentBanner /> */}
      </body>
    </html>
  );
}
