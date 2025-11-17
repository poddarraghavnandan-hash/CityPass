import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ConsentBanner } from '@/components/ConsentBanner';
import { NhostProvider } from '@/components/NhostProvider';
import { defaultMetadata, generateOrganizationJsonLd, generateWebsiteJsonLd } from '@/lib/metadata';
import { WebVitals } from '@/components/WebVitals';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationJsonLd = generateOrganizationJsonLd();
  const websiteJsonLd = generateWebsiteJsonLd();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={inter.className}>
        <WebVitals />
        <NhostProvider>
          {children}
          {/* Temporarily disabled - not working properly */}
          {/* <ConsentBanner /> */}
        </NhostProvider>
      </body>
    </html>
  );
}
