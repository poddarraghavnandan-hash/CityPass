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
      <body className={cn('flex min-h-screen flex-col bg-gradient-to-b from-[#050509] via-[#060a13] to-[#0A0F18] text-slate-100 antialiased', inter.className)}>
        <WebVitals />
        <NhostProvider>
          <ToastProvider>
            <div className="flex flex-1 flex-col">
              <TopNav />
              <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
              <Footer />
            </div>
          </ToastProvider>
        </NhostProvider>
      </body>
    </html>
  );
}
