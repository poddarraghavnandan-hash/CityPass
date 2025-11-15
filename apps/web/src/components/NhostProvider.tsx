'use client';

// Temporarily disabled - Nhost packages are deprecated and incompatible with Next.js 16
// import { NhostProvider as NhostReactProvider } from '@nhost/nextjs';
// import { nhost } from '@/lib/nhost';

export function NhostProvider({ children }: { children: React.ReactNode }) {
  // return <NhostReactProvider nhost={nhost}>{children}</NhostReactProvider>;
  return <>{children}</>;
}
