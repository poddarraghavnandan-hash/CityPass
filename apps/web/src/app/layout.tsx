import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@/styles/app.css';
import { NhostProvider } from '@/components/NhostProvider';
import { defaultMetadata, generateOrganizationJsonLd, generateWebsiteJsonLd } from '@/lib/metadata';
import { WebVitals } from '@/components/WebVitals';
import { TopNav } from '@/components/layout/TopNav';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/lib/utils';
import { ToastProvider } from '@/components/ui/toast';

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
      <body className={cn('bg-[#05030b] text-white antialiased', inter.className)}>
        <WebVitals />
        <NhostProvider>
          <ToastProvider>
            <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_10%_5%,rgba(77,123,255,0.2),transparent_45%),_radial-gradient(circle_at_90%_0%,rgba(244,91,255,0.15),transparent_35%)]">
              <TopNav />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </ToastProvider>
        </NhostProvider>
      </body>
    </html>
  );
}
