'use client';

import { useState } from 'react';
import type { RankedItem } from '@citypass/types/lens';

interface PlanPanelProps {
  item: RankedItem;
}

export function PlanPanel({ item }: PlanPanelProps) {
  const [downloading, setDownloading] = useState(false);

  const downloadIcs = async () => {
    try {
      setDownloading(true);
      const response = await fetch('/api/lens/plan/ics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: item.id }),
      });
      if (!response.ok) throw new Error('Failed to generate calendar');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${item.title}.ics`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: item.title,
        url: item.bookingUrl || window.location.href,
      });
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 p-4 bg-white/5 space-y-3">
      <h3 className="text-lg font-semibold">Plan it</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <ActionButton label="Save" onClick={downloadIcs} loading={downloading} />
        <ActionButton label="Share" onClick={share} />
        <ActionButton label="Route" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.venueName || item.title)}`, '_blank')} />
        <ActionButton label="Book" onClick={() => item.bookingUrl && window.open(item.bookingUrl, '_blank')} disabled={!item.bookingUrl} />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  loading,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      className="rounded-2xl border border-white/15 px-3 py-3 bg-white/10 text-white/90 disabled:opacity-40"
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? '…' : label}
    </button>
  );
}
