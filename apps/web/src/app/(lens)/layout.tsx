import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import '@/styles/lens.css';

export default function LensLayout({ children }: { children: ReactNode }) {
  // Temporarily disabled feature flag to test CityLens routes
  // TODO: Fix environment variable loading
  // if (process.env.CITYLENS_ENABLED !== 'true') {
  //   redirect('/feed/classic');
  // }

  return (
    <div className="lens-shell min-h-screen">
      {children}
    </div>
  );
}
