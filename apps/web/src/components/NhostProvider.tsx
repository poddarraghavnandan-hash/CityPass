'use client';

import { SessionProvider } from 'next-auth/react';

export function NhostProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
