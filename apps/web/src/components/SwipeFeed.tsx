'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  Heart,
  X,
  Calendar,
  Share2,
  MapPin,
  Clock,
  DollarSign,
  ChevronDown,
  Bookmark,
  ExternalLink,
} from 'lucide-react';

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

interface SwipeFeedProps {
  initialEvents: Event[];
  onLoadMore: () => Promise<Event[]>;
  onLike: (eventId: string) => void;
  onDislike: (eventId: string) => void;
  onSave: (eventId: string) => void;
  onShare: (eventId: string) => void;
}

export function SwipeFeed({
  initialEvents,
  onLoadMore,
  onLike,
  onDislike,
  onSave,
  onShare,
}: SwipeFeedProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);

  const currentEvent = events[currentIndex];

  // Prefetch next 3 events
  useEffect(() => {
    if (currentIndex >= events.length - 3 && !loading) {
      loadMoreEvents();
    }
  }, [currentIndex]);

  const loadMoreEvents = async () => {
    setLoading(true);
    try {
      const newEvents = await onLoadMore();
      setEvents(prev => [...prev, ...newEvents]);
    } catch (error) {
      console.error('Failed to load more events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwipeUp = () => {
    setDirection('up');
    setTimeout(() => {
      setCurrentIndex(prev => Math.min(prev + 1, events.length - 1));
      setDirection(null);
    }, 300);
  };

  const handleSwipeDown = () => {
    if (currentIndex > 0) {
      setDirection('down');
      setTimeout(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
        setDirection(null);
      }, 300);
    }
  };

  const handleSwipeLeft = () => {
    onDislike(currentEvent.id);
    handleSwipeUp();
  };

  const handleSwipeRight = () => {
    onLike(currentEvent.id);
    onSave(currentEvent.id);
    handleSwipeUp();
  };

  if (!currentEvent) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-4" />
          <p>Loading amazing events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black overflow-hidden relative">
      {/* Event Card */}
      <EventCard
        event={currentEvent}
        onSwipeUp={handleSwipeUp}
        onSwipeDown={handleSwipeDown}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        direction={direction}
      />

      {/* Quick Actions Overlay */}
      <div className="absolute bottom-24 left-0 right-0 z-20 px-6">
        <div className="flex items-center justify-center gap-6">
          {/* Dislike */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSwipeLeft}
            className="w-16 h-16 rounded-full bg-red-500/20 backdrop-blur-md border-2 border-red-500 flex items-center justify-center hover:bg-red-500/30 transition"
          >
            <X className="w-7 h-7 text-red-500" />
          </motion.button>

          {/* Save */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              onSave(currentEvent.id);
              handleSwipeRight();
            }}
            className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white flex items-center justify-center hover:bg-white/30 transition"
          >
            <Heart className="w-9 h-9 text-white fill-white" />
          </motion.button>

          {/* Share */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onShare(currentEvent.id)}
            className="w-16 h-16 rounded-full bg-blue-500/20 backdrop-blur-md border-2 border-blue-500 flex items-center justify-center hover:bg-blue-500/30 transition"
          >
            <Share2 className="w-7 h-7 text-blue-500" />
          </motion.button>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="absolute top-6 left-0 right-0 z-20 px-6">
        <div className="flex gap-1">
          {events.slice(0, 10).map((_, idx) => (
            <div
              key={idx}
              className={`flex-1 h-0.5 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-white'
                  : idx < currentIndex
                  ? 'bg-white/50'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Swipe Hint */}
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: [1, 0.5, 1], y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-4 left-0 right-0 z-10 flex justify-center"
      >
        <div className="flex items-center gap-2 text-white/60 text-sm">
          <ChevronDown className="w-4 h-4" />
          <span>Swipe up for next</span>
        </div>
      </motion.div>
    </div>
  );
}

interface EventCardProps {
  event: Event;
  onSwipeUp: () => void;
  onSwipeDown: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  direction: 'up' | 'down' | null;
}

function EventCard({
  event,
  onSwipeUp,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
  direction,
}: EventCardProps) {
  const y = useMotionValue(0);
  const x = useMotionValue(0);

  const rotateX = useTransform(y, [-300, 0, 300], [15, 0, -15]);
  const opacity = useTransform(y, [-300, 0, 300], [0, 1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;

    if (info.offset.y < -threshold) {
      onSwipeUp();
    } else if (info.offset.y > threshold) {
      onSwipeDown();
    } else if (info.offset.x < -threshold) {
      onSwipeLeft();
    } else if (info.offset.x > threshold) {
      onSwipeRight();
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  };

  const formatPrice = (): string => {
    if (event.priceMin === null && event.priceMax === null) {
      return 'Free';
    }
    if (event.priceMin === 0 && event.priceMax === 0) {
      return 'Free';
    }
    if (event.priceMin === event.priceMax) {
      return `${event.currency || '$'}${event.priceMin}`;
    }
    if (event.priceMin && event.priceMax) {
      return `${event.currency || '$'}${event.priceMin} - ${event.currency || '$'}${event.priceMax}`;
    }
    if (event.priceMin) {
      return `From ${event.currency || '$'}${event.priceMin}`;
    }
    return 'Price varies';
  };

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      onDragEnd={handleDragEnd}
      style={{ y, rotateX, opacity }}
      animate={{
        y: direction === 'up' ? -1000 : direction === 'down' ? 1000 : 0,
        opacity: direction ? 0 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600" />
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-32 left-0 right-0 px-6 space-y-4 z-10">
        {/* Category Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-white text-sm font-medium border border-white/30">
            {event.category}
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-bold text-white leading-tight"
        >
          {event.title}
        </motion.h2>

        {/* Description */}
        {event.description && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/90 text-lg line-clamp-2"
          >
            {event.description}
          </motion.p>
        )}

        {/* Event Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-4"
        >
          {/* Date/Time */}
          <div className="flex items-center gap-2 text-white/90">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{formatDate(event.startTime)}</span>
          </div>

          {/* Location */}
          {event.venueName && (
            <div className="flex items-center gap-2 text-white/90">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium line-clamp-1">{event.venueName}</span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2 text-white/90">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">{formatPrice()}</span>
          </div>
        </motion.div>

        {/* Book Button */}
        <motion.a
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          href={event.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-white/90 transition"
        >
          <span>Get Tickets</span>
          <ExternalLink className="w-5 h-5" />
        </motion.a>
      </div>
    </motion.div>
  );
}
