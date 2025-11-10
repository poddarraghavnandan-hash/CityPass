'use client';

import { useState, useEffect } from 'react';
import { SocialProofBadge } from './SocialProofBadge';
import { FOMOLabel } from './FOMOLabel';

interface HotEvent {
  id: string;
  title: string;
  venueName: string;
  imageUrl?: string;
  date: Date | string;
  category: string;
  priceLevel: number;
  viewCount24h: number;
  saveCount24h: number;
  friendSaveCount?: number;
  ticketsRemaining?: number;
  surgeScore: number; // 0-1, calculated from recent activity
}

interface HotRightNowProps {
  city?: string;
  limit?: number;
  className?: string;
}

export function HotRightNow({ city, limit = 10, className = '' }: HotRightNowProps) {
  const [hotEvents, setHotEvents] = useState<HotEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHotEvents();
  }, [city]);

  const loadHotEvents = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sessionId = getSessionId();
      const userId = localStorage.getItem('citypass_user_id') || undefined;

      const response = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          city: city || 'New York',
          limit,
          sortBy: 'trending', // Special sort for hot events
          exploreRate: 0, // No exploration, pure trending
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load trending events');
      }

      const data = await response.json();

      // Transform results into HotEvent format
      const events: HotEvent[] = data.results.map((event: any) => ({
        id: event.id,
        title: event.title,
        venueName: event.venueName,
        imageUrl: event.imageUrl,
        date: event.date,
        category: event.category,
        priceLevel: event.priceLevel || 0,
        viewCount24h: event._socialProof?.viewCount24h || 0,
        saveCount24h: event._socialProof?.saveCount24h || 0,
        friendSaveCount: event._socialProof?.friendSaveCount || 0,
        ticketsRemaining: event.ticketsRemaining,
        surgeScore: calculateSurgeScore(event),
      }));

      setHotEvents(events);
    } catch (err) {
      console.error('Failed to load hot events:', err);
      setError('Failed to load trending events');
    } finally {
      setIsLoading(false);
    }
  };

  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('citypass_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('citypass_session_id', sessionId);
    }
    return sessionId;
  };

  const calculateSurgeScore = (event: any): number => {
    const views = event._socialProof?.viewCount24h || 0;
    const saves = event._socialProof?.saveCount24h || 0;

    // Weighted surge score: saves are 5x more valuable than views
    const score = (views * 0.01 + saves * 0.05) / 100;
    return Math.min(score, 1);
  };

  if (isLoading) {
    return (
      <div className={`rounded-lg bg-gradient-to-r from-orange-50 to-red-50 p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🔥</span>
          <h2 className="text-xl font-bold text-gray-900">Hot Right Now</h2>
        </div>
        <div className="text-gray-600">Loading trending events...</div>
      </div>
    );
  }

  if (error || hotEvents.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-lg bg-gradient-to-r from-orange-50 to-red-50 p-6 ${className}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="animate-pulse text-2xl">🔥</span>
          <h2 className="text-xl font-bold text-gray-900">Hot Right Now</h2>
        </div>
        <div className="text-sm text-gray-600">
          {city || 'New York'} • Updated live
        </div>
      </div>

      {/* Horizontal scrollable event cards */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-2">
          {hotEvents.map((event) => (
            <HotEventCard key={event.id} event={event} />
          ))}
        </div>
      </div>

      {/* Refresh button */}
      <div className="mt-4 text-center">
        <button
          onClick={loadHotEvents}
          className="text-sm font-medium text-orange-600 hover:text-orange-700"
        >
          Refresh trending
        </button>
      </div>
    </div>
  );
}

interface HotEventCardProps {
  event: HotEvent;
}

function HotEventCard({ event }: HotEventCardProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getPriceLabel = (level: number) => {
    if (level === 0) return 'Free';
    return '$'.repeat(level);
  };

  return (
    <a
      href={`/events/${event.id}`}
      className="group relative flex-none w-64 overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:scale-105 hover:shadow-lg"
    >
      {/* Image */}
      <div className="relative h-36 overflow-hidden bg-gray-200">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <span className="text-4xl">🎉</span>
          </div>
        )}

        {/* Surge indicator */}
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-white shadow-lg">
            <span className="animate-pulse">🔥</span>
            <span>Trending</span>
          </div>
        </div>

        {/* FOMO labels */}
        {event.ticketsRemaining && event.ticketsRemaining <= 20 && (
          <div className="absolute bottom-2 left-2">
            <FOMOLabel
              type="limited_tickets"
              ticketsRemaining={event.ticketsRemaining}
              variant="pill"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-orange-600">
            {event.title}
          </h3>
        </div>

        <div className="mb-2 flex items-center gap-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1">
            <span>📍</span>
            <span className="truncate">{event.venueName}</span>
          </span>
        </div>

        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-700">{formatDate(event.date)}</span>
          <span className="font-medium text-gray-700">{getPriceLabel(event.priceLevel)}</span>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap gap-1">
          {(event.friendSaveCount ?? 0) > 0 && (
            <SocialProofBadge
              type="friends_saved"
              count={event.friendSaveCount}
              variant="subtle"
            />
          )}
          {event.viewCount24h > 100 && (
            <SocialProofBadge
              type="viewing_now"
              count={event.viewCount24h}
              variant="subtle"
            />
          )}
        </div>
      </div>
    </a>
  );
}
