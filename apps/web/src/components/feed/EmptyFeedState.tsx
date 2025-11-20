
'use client';

import Link from 'next/link';

export function EmptyFeedState() {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center text-white">
      <h3 className="text-lg font-semibold">No matches yet</h3>
      <p className="mt-2 text-sm text-white/70">Adjust your filters or ask CityLens directly for something fresh.</p>
      <Link
        href="/chat?prompt=Find%20me%20something%20new%20today"
        className="mt-4 inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#050509] transition hover:bg-white/90"
      >
        Ask CityLens to find something
      </Link>
    </div>
  );
}
