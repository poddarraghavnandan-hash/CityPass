'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Music,
  PartyPopper,
  Dumbbell,
  Coffee,
  Theater,
  Utensils,
  Palette,
  Users,
  Sparkles,
  TrendingUp,
  Flame,
} from 'lucide-react';

interface CategoryCardProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  count?: number;
  loading?: boolean;
  onClick: () => void;
}

interface CategoryCounts {
  [key: string]: number;
}

const CATEGORIES = [
  {
    id: 'NIGHTLIFE',
    label: 'Going Out',
    icon: PartyPopper,
    gradient: 'from-purple-500 to-pink-500',
    searchQuery: 'bars nightlife',
  },
  {
    id: 'MUSIC',
    label: 'Dancing',
    icon: Music,
    gradient: 'from-pink-500 to-rose-500',
    searchQuery: 'dancing clubs music',
  },
  {
    id: 'FITNESS',
    label: 'Fitness',
    icon: Dumbbell,
    gradient: 'from-blue-500 to-cyan-500',
    searchQuery: 'fitness workout gym',
  },
  {
    id: 'WELLNESS',
    label: 'Yoga',
    icon: Coffee,
    gradient: 'from-teal-500 to-emerald-500',
    searchQuery: 'yoga meditation wellness',
  },
  {
    id: 'PERFORMING_ARTS',
    label: 'Shows',
    icon: Theater,
    gradient: 'from-indigo-500 to-purple-500',
    searchQuery: 'theatre shows performances',
  },
  {
    id: 'FOOD_DRINK',
    label: 'Food',
    icon: Utensils,
    gradient: 'from-orange-500 to-red-500',
    searchQuery: 'food dining restaurants',
  },
  {
    id: 'VISUAL_ARTS',
    label: 'Arts',
    icon: Palette,
    gradient: 'from-violet-500 to-fuchsia-500',
    searchQuery: 'art galleries exhibitions',
  },
  {
    id: 'NETWORKING',
    label: 'Social',
    icon: Users,
    gradient: 'from-green-500 to-teal-500',
    searchQuery: 'networking social meetups',
  },
  {
    id: 'SURPRISE',
    label: 'Surprise Me',
    icon: Sparkles,
    gradient: 'from-yellow-500 to-amber-500',
    searchQuery: '',
  },
];

function CategoryCard({ id, label, icon: Icon, gradient, count, loading, onClick }: CategoryCardProps) {
  const isTrending = count && count > 50;
  const isHot = count && count > 100;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, rotateY: 5, z: 50 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`
        relative overflow-hidden rounded-3xl p-6
        bg-gradient-to-br ${gradient}
        shadow-lg hover:shadow-2xl
        group cursor-pointer
        min-h-[160px] flex flex-col items-center justify-center
        border border-white/20
      `}
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
    >
      {/* Glassmorphism Overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md" />

      {/* Animated Gradient Background */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.2) 0%, transparent 70%)`,
        }}
      />

      {/* Trending/Hot Badge */}
      {isHot && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute top-3 right-3 z-20"
        >
          <div className="flex items-center gap-1 bg-red-500/90 backdrop-blur-sm rounded-full px-2 py-1">
            <Flame className="w-3 h-3 text-white" />
            <span className="text-xs font-bold text-white">HOT</span>
          </div>
        </motion.div>
      )}
      {isTrending && !isHot && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 z-20"
        >
          <div className="flex items-center gap-1 bg-orange-500/90 backdrop-blur-sm rounded-full px-2 py-1">
            <TrendingUp className="w-3 h-3 text-white" />
            <span className="text-xs font-bold text-white">TRENDING</span>
          </div>
        </motion.div>
      )}

      {/* Icon with 3D effect */}
      <motion.div
        className="relative z-10 mb-3"
        whileHover={{ rotateY: 360, scale: 1.2 }}
        transition={{ duration: 0.6 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-xl">
          <Icon className="w-9 h-9 text-white drop-shadow-2xl" />
        </div>
      </motion.div>

      {/* Label */}
      <motion.div
        className="relative z-10 text-white font-bold text-xl mb-2"
        whileHover={{ scale: 1.1 }}
      >
        {label}
      </motion.div>

      {/* Event Count Badge with pulse animation */}
      {loading ? (
        <div className="relative z-10 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/30">
          <div className="text-xs text-white/90 font-medium">Loading...</div>
        </div>
      ) : count !== undefined && count > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/30"
        >
          <div className="text-sm text-white font-semibold">
            {count} {count === 1 ? 'event' : 'events'}
          </div>
        </motion.div>
      ) : null}

      {/* Shimmer Effect on Hover */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
        }}
      />
    </motion.button>
  );
}

export function CategoryPanel() {
  const router = useRouter();
  const [counts, setCounts] = useState<CategoryCounts>({});
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('New York');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Detect user's city (placeholder - would use geolocation in production)
  useEffect(() => {
    // TODO: Use browser geolocation API + reverse geocoding
    // For now, default to New York
    setCity('New York');
  }, []);

  // Fetch event counts for each category
  useEffect(() => {
    async function fetchCounts() {
      setLoading(true);
      const newCounts: CategoryCounts = {};

      try {
        // Helper function to fetch with timeout
        const fetchWithTimeout = async (url: string, timeout = 10000) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        };

        // Fetch counts in parallel for all categories
        const countPromises = CATEGORIES.filter(cat => cat.id !== 'SURPRISE').map(async (category) => {
          try {
            const timeFilter = getSmartTimeFilter(currentTime);
            const url = `/api/search?q=${encodeURIComponent(category.searchQuery)}&city=${encodeURIComponent(city)}&limit=1&category=${category.id}&${timeFilter}`;

            const response = await fetchWithTimeout(url, 10000);

            if (response.ok) {
              const data = await response.json();
              return { id: category.id, count: data.total || 0 };
            } else {
              console.warn(`API returned ${response.status} for ${category.id}`);
              return { id: category.id, count: 0 };
            }
          } catch (error: any) {
            console.error(`Failed to fetch count for ${category.id}:`, error?.name, error?.message);
            return { id: category.id, count: 0 };
          }
        });

        const results = await Promise.all(countPromises);
        results.forEach(({ id, count }) => {
          newCounts[id] = count;
        });

        setCounts(newCounts);
      } catch (error) {
        console.error('Failed to fetch category counts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, [city, currentTime]);

  // Get smart time filter based on current time
  function getSmartTimeFilter(date: Date): string {
    const hour = date.getHours();

    // Morning (6am-12pm) -> morning events
    if (hour >= 6 && hour < 12) {
      return 'timePreference=morning';
    }
    // Afternoon (12pm-5pm) -> afternoon events
    else if (hour >= 12 && hour < 17) {
      return 'timePreference=afternoon';
    }
    // Evening (5pm-10pm) -> evening events
    else if (hour >= 17 && hour < 22) {
      return 'timePreference=evening';
    }
    // Night (10pm-6am) -> night events
    else {
      return 'timePreference=night';
    }
  }

  function handleCategoryClick(category: typeof CATEGORIES[0]) {
    if (category.id === 'SURPRISE') {
      // Surprise Me: Random high-quality event based on preferences
      router.push(`/search?surprise=true&city=${encodeURIComponent(city)}`);
    } else {
      // Navigate to category-filtered search
      const timeFilter = getSmartTimeFilter(currentTime);
      router.push(
        `/search?category=${category.id}&city=${encodeURIComponent(city)}&${timeFilter}`
      );
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          What do you want to do?
        </h2>
        <p className="text-gray-600">
          Discover events and experiences in {city}
        </p>
      </div>

      {/* Category Grid with Staggered Animation */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        {CATEGORIES.map((category, index) => (
          <motion.div
            key={category.id}
            variants={{
              hidden: { opacity: 0, y: 50, scale: 0.9 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 100,
                  damping: 12,
                },
              },
            }}
          >
            <CategoryCard
              id={category.id}
              label={category.label}
              icon={category.icon}
              gradient={category.gradient}
              count={counts[category.id]}
              loading={loading && category.id !== 'SURPRISE'}
              onClick={() => handleCategoryClick(category)}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Smart Context Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        {currentTime.getHours() >= 6 && currentTime.getHours() < 12 && (
          <p>Good morning! Showing morning activities ☀️</p>
        )}
        {currentTime.getHours() >= 12 && currentTime.getHours() < 17 && (
          <p>Good afternoon! Showing afternoon events 🌤️</p>
        )}
        {currentTime.getHours() >= 17 && currentTime.getHours() < 22 && (
          <p>Good evening! Showing tonight's events 🌆</p>
        )}
        {(currentTime.getHours() >= 22 || currentTime.getHours() < 6) && (
          <p>Late night? Showing nighttime events 🌙</p>
        )}
      </div>
    </div>
  );
}
