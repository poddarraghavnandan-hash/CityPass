'use client';

import { useState, useEffect } from 'react';
import { SwipeFeed } from '@/components/SwipeFeed';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime?: string | null;
  venueName?: string | null;
  address?: string | null;
  city: string;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: string;
  category: string;
  imageUrl?: string | null;
  bookingUrl: string;
}

export default function FeedPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadInitialEvents();
  }, []);

  const loadInitialEvents = async () => {
    try {
      const response = await fetch('/api/search?q=popular events&city=New York&limit=20');
      const data = await response.json();

      if (data.success && data.results) {
        setEvents(data.results);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreEvents = async (): Promise<Event[]> => {
    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/search?q=trending events&city=New York&limit=20&page=${nextPage}`);
      const data = await response.json();

      if (data.success && data.results) {
        setPage(nextPage);
        return data.results;
      }
      return [];
    } catch (error) {
      console.error('Failed to load more events:', error);
      return [];
    }
  };

  const handleLike = async (eventId: string) => {
    console.log('Liked event:', eventId);
    // TODO: Send to analytics/ML training
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type: 'LIKE' }),
    });
  };

  const handleDislike = async (eventId: string) => {
    console.log('Disliked event:', eventId);
    // TODO: Send to analytics/ML training
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type: 'DISLIKE' }),
    });
  };

  const handleSave = async (eventId: string) => {
    console.log('Saved event:', eventId);
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type: 'SAVE' }),
    });
  };

  const handleShare = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out this event: ${event.title}`,
          url: event.bookingUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(event.bookingUrl);
      alert('Link copied to clipboard!');
    }

    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type: 'SHARE' }),
    });
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4" />
          <p>Loading your personalized feed...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center px-6">
        <div className="text-white text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">No Events Found</h2>
          <p className="text-white/70 mb-6">
            We couldn't find any events right now. Try adjusting your preferences or check back later.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-white text-black rounded-full font-semibold hover:bg-white/90 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <SwipeFeed
      initialEvents={events}
      onLoadMore={loadMoreEvents}
      onLike={handleLike}
      onDislike={handleDislike}
      onSave={handleSave}
      onShare={handleShare}
    />
  );
}
