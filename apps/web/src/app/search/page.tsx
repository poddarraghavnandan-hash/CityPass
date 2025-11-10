'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, MapPin, Calendar, DollarSign, Sparkles, TrendingUp, Filter, Heart, Share2, Bookmark, ExternalLink, Moon, Sun, X as CloseIcon } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { CityPassEvent } from '@/lib/event-types';

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [cachedEvents, setCachedEvents] = useState<CityPassEvent[]>([]);
  const [freshEvents, setFreshEvents] = useState<CityPassEvent[]>([]);
  const [events, setEvents] = useState<CityPassEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [cacheLoading, setCacheLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cacheError, setCacheError] = useState<string | null>(null);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || 'New York');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [darkMode, setDarkMode] = useState(false);
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());
  const pendingRequest = useRef<AbortController | null>(null);
  const pendingCacheRequest = useRef<AbortController | null>(null);

  const cities = ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston'];
  const categories = ['MUSIC', 'COMEDY', 'THEATRE', 'ARTS', 'FOOD', 'FITNESS', 'DANCE'];
  const isInitialLoading = loading && cacheLoading && events.length === 0;
  const isShowingCachedWhileLoading = cachedEvents.length > 0 && loading;

  // Detect system theme preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Apply dark mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    fetchCachedResults();
    fetchResults();
    return () => {
      pendingRequest.current?.abort();
      pendingCacheRequest.current?.abort();
    };
  }, [searchParams]);

  useEffect(() => {
    setEvents(mergeEventLists(cachedEvents, freshEvents));
  }, [cachedEvents, freshEvents]);

  const fetchCachedResults = async () => {
    pendingCacheRequest.current?.abort();
    const controller = new AbortController();
    pendingCacheRequest.current = controller;

    setCacheLoading(true);
    setCacheError(null);

    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (city) params.append('city', city);
    if (category) params.append('category', category);
    const timePreference = searchParams.get('timePreference');
    if (timePreference) params.append('timePreference', timePreference);
    params.append('cacheOnly', 'true');

    try {
      const response = await fetch(`/api/search?${params}`, {
        signal: controller.signal,
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Cache lookup failed');
      }

      setCachedEvents(data.results || []);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.warn('Cache lookup failed:', error?.message || error);
      setCachedEvents([]);
      setCacheError(error?.message || 'Cache unavailable');
    } finally {
      if (pendingCacheRequest.current === controller) {
        setCacheLoading(false);
      }
    }
  };

  const fetchResults = async () => {
    pendingRequest.current?.abort();
    const controller = new AbortController();
    pendingRequest.current = controller;

    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (city) params.append('city', city);
    if (category) params.append('category', category);
    params.append('limit', '20');
    const timePreference = searchParams.get('timePreference');
    if (timePreference) params.append('timePreference', timePreference);

    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`/api/search?${params}`, {
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Search failed');
      }

      setFreshEvents(data.results || []);
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.error('Search failed:', error);
      setFreshEvents([]);
      setError(error?.message || 'Search failed. Please try again.');
    } finally {
      clearTimeout(timeoutId);
      if (pendingRequest.current === controller) {
        setLoading(false);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (city) params.append('city', city);
    if (category) params.append('category', category);
    router.push(`/search?${params}`);
  };

  const handleSaveEvent = async (eventId: string) => {
    setSavedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });

    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, type: 'SAVE' }),
    });
  };

  const handleShareEvent = async (event: CityPassEvent) => {
    if (navigator.share && event.bookingUrl) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out: ${event.title}`,
          url: event.bookingUrl,
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else if (event.bookingUrl) {
      navigator.clipboard.writeText(event.bookingUrl);
      alert('Link copied to clipboard!');
    }

    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: event.id, type: 'SHARE' }),
    });
  };

  const formatPrice = (event: CityPassEvent) => {
    if (event.priceMin === 0 && !event.priceMax) return 'Free';
    if (typeof event.priceMin === 'number' && typeof event.priceMax === 'number') {
      return `$${event.priceMin} - $${event.priceMax}`;
    }
    if (typeof event.priceMin === 'number') return `From $${event.priceMin}`;
    return 'Price varies';
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-black'
        : 'bg-gradient-to-br from-purple-50 via-white to-blue-50'
    }`}>
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`sticky top-0 z-50 backdrop-blur-xl border-b ${
          darkMode
            ? 'bg-black/40 border-white/10'
            : 'bg-white/60 border-gray-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/')}
              className="flex items-center space-x-2"
            >
              <Sparkles className={`w-8 h-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                CityPass
              </span>
            </motion.button>

            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full ${
                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Search Bar */}
      <div className={`sticky top-16 z-40 backdrop-blur-xl border-b shadow-lg ${
        darkMode ? 'bg-black/40 border-white/10' : 'bg-white/60 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className={`flex-1 flex items-center rounded-xl px-4 py-3 border backdrop-blur-md ${
              darkMode
                ? 'bg-white/10 border-white/20'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <Search className={`w-5 h-5 mr-3 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events..."
                className={`flex-1 bg-transparent border-none outline-none ${
                  darkMode
                    ? 'text-white placeholder-gray-400'
                    : 'text-gray-700 placeholder-gray-400'
                }`}
              />
            </div>

            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={`px-4 py-3 rounded-xl border outline-none cursor-pointer backdrop-blur-md ${
                darkMode
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              {cities.map((c) => (
                <option key={c} value={c} className={darkMode ? 'bg-gray-900' : 'bg-white'}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`px-4 py-3 rounded-xl border outline-none cursor-pointer backdrop-blur-md ${
                darkMode
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}
            >
              <option value="" className={darkMode ? 'bg-gray-900' : 'bg-white'}>All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className={darkMode ? 'bg-gray-900' : 'bg-white'}>
                  {cat}
                </option>
              ))}
            </select>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition"
            >
              Search
            </motion.button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isInitialLoading ? (
          <div className="text-center py-20">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className={`inline-block rounded-full h-12 w-12 border-4 ${
                darkMode
                  ? 'border-purple-400 border-t-transparent'
                  : 'border-purple-600 border-t-transparent'
              }`}
            />
            <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Gathering events for you...
            </p>
          </div>
        ) : events.length === 0 && error ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <Sparkles className={`w-16 h-16 mx-auto mb-4 ${
              darkMode ? 'text-red-300' : 'text-red-400'
            }`} />
            <h2 className={`text-2xl font-bold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              We hit a snag
            </h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {error}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchResults}
              className="mt-6 px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl"
            >
              Try again
            </motion.button>
          </motion.div>
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <Sparkles className={`w-16 h-16 mx-auto mb-4 ${
              darkMode ? 'text-gray-600' : 'text-gray-300'
            }`} />
            <h2 className={`text-2xl font-bold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              No events found
            </h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Try adjusting your search or filters
            </p>
          </motion.div>
        ) : (
          <>
            {isShowingCachedWhileLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 px-4 py-3 rounded-2xl text-sm font-medium flex items-center gap-2 ${
                  darkMode
                    ? 'bg-white/10 border border-white/10 text-white'
                    : 'bg-purple-50 border border-purple-100 text-purple-700'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Instant picks while live results finish loading...
              </motion.div>
            )}

            {error && events.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-4 px-4 py-3 rounded-2xl text-sm ${
                  darkMode
                    ? 'bg-red-500/10 text-red-200 border border-red-500/30'
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}
              >
                Live refresh failed — showing cached picks. {error}
              </motion.div>
            )}

            {cacheError && cachedEvents.length === 0 && (
              <p className={`mb-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Could not load instant picks: {cacheError}
              </p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center justify-between"
            >
              <div>
                <h2 className={`text-2xl font-bold mb-1 ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {events.length} Events Found
                </h2>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {query && `Results for "${query}" in ${city}`}
                  {!query && `All events in ${city}`}
                </p>
              </div>
              {query && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`flex items-center px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md ${
                    darkMode
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI-Ranked
                </motion.div>
              )}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className={`rounded-2xl border overflow-hidden backdrop-blur-xl group cursor-pointer transition-all ${
                    darkMode
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      : 'bg-white/60 border-gray-200 hover:bg-white hover:shadow-2xl'
                  }`}
                >
                  {/* Image Container */}
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                        <Sparkles className={`w-12 h-12 ${darkMode ? 'text-purple-400' : 'text-purple-300'}`} />
                      </div>
                    )}

                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-3 right-3 flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEvent(event.id);
                          }}
                          className={`p-2 rounded-full backdrop-blur-md transition ${
                            savedEvents.has(event.id)
                              ? 'bg-red-500 text-white'
                              : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${savedEvents.has(event.id) ? 'fill-current' : ''}`} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareEvent(event);
                          }}
                          className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition"
                        >
                          <Share2 className="w-5 h-5" />
                        </motion.button>
                      </div>
                    </div>

                    {/* Category Badge */}
                    {event.category && (
                      <div className="absolute top-3 left-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md ${
                          darkMode
                            ? 'bg-purple-500/30 text-purple-200 border border-purple-400/30'
                            : 'bg-purple-100/80 text-purple-700'
                        }`}>
                          {event.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className={`text-xl font-bold line-clamp-2 flex-1 ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {event.title}
                      </h3>
                    </div>

                    {event.subtitle && (
                      <p className={`text-sm mb-4 line-clamp-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        {event.subtitle}
                      </p>
                    )}

                    <div className="space-y-2 mb-4">
                      {event.venueName && (
                        <div className={`flex items-center text-sm ${
                          darkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {event.venueName}
                            {event.neighborhood && ` • ${event.neighborhood}`}
                          </span>
                        </div>
                      )}

                      <div className={`flex items-center text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{format(new Date(event.startTime), 'EEE, MMM d • h:mm a')}</span>
                      </div>

                      <div className={`flex items-center text-sm font-medium ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{formatPrice(event)}</span>
                      </div>
                    </div>

                    {event.bookingUrl ? (
                      <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href={event.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition"
                      >
                        <span>Get Tickets</span>
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </motion.a>
                    ) : event.source ? (
                      <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href={event.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center w-full px-4 py-3 rounded-xl font-medium transition ${
                          darkMode
                            ? 'border border-white/20 text-white hover:bg-white/10'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>View Details</span>
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </motion.a>
                    ) : (
                      <button
                        disabled
                        className={`w-full px-4 py-3 rounded-xl font-medium opacity-50 cursor-not-allowed ${
                          darkMode
                            ? 'border border-white/20 text-white'
                            : 'border border-gray-300 text-gray-700'
                        }`}
                      >
                        No Details Available
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function mergeEventLists(primary: CityPassEvent[], secondary: CityPassEvent[]): CityPassEvent[] {
  const seen = new Set<string>();
  const merged: CityPassEvent[] = [];
  const lists = [primary, secondary];

  for (const list of lists) {
    for (const event of list) {
      const key = event?.id || `${event.title}-${event.startTime}`;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(event);
    }
  }

  return merged;
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SearchResults />
    </Suspense>
  );
}
