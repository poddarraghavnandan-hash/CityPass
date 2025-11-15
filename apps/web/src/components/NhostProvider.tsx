'use client';

import { NhostProvider as NhostReactProvider } from '@nhost/nextjs';
import { nhost } from '@/lib/nhost';

export function NhostProvider({ children }: { children: React.ReactNode }) {
  return <NhostReactProvider nhost={nhost}>{children}</NhostReactProvider>;
}
