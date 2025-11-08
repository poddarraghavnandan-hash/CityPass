'use client';

import { useState, useEffect } from 'react';
import { Search, Sparkles, MapPin, Calendar, TrendingUp, DollarSign, Moon, Sun, Menu, X as CloseIcon, ArrowRight, Zap, Heart, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CategoryPanel } from '@/components/CategoryPanel';

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('New York');
  const [isSearching, setIsSearching] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'search' | 'categories' | 'feed'>('categories');

  const cities = ['New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston'];

  // Detect system theme preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    router.push(`/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`);
  };

  const popularSearches = [
    'jazz tonight',
    'free outdoor events',
    'comedy shows this weekend',
    'food festivals',
    'art galleries',
    'live music venues',
  ];

  const features = [
    {
      icon: Sparkles,
      title: 'AI-Powered Discovery',
      description: 'Natural language search understands exactly what you want',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Heart,
      title: 'Hidden Gems',
      description: 'Discover independent venues and small businesses',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      icon: Zap,
      title: 'Real-Time Updates',
      description: 'Always fresh events from across the city',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Users,
      title: 'Personalized Feed',
      description: 'ML-powered recommendations based on your taste',
      gradient: 'from-violet-500 to-purple-500',
    },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode
        ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-black'
        : 'bg-gradient-to-br from-purple-50 via-white to-blue-50'
    }`}>
      {/* Navigation with Glassmorphism */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors ${
          darkMode
            ? 'bg-black/40 border-white/10'
            : 'bg-white/60 border-gray-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center space-x-2 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className={`w-8 h-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </motion.div>
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-30"></div>
              </div>
              <span className={`text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent`}>
                CityPass
              </span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => router.push('/feed')}
                className={`transition ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Feed
              </button>
              <button
                onClick={() => router.push('/search')}
                className={`transition ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Explore
              </button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full transition ${
                  darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition"
              >
                Get Started
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg"
            >
              {mobileMenuOpen ? (
                <CloseIcon className={darkMode ? 'text-white' : 'text-gray-900'} />
              ) : (
                <Menu className={darkMode ? 'text-white' : 'text-gray-900'} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`md:hidden border-t overflow-hidden ${
                darkMode ? 'bg-black/60 border-white/10' : 'bg-white/80 border-gray-200/50'
              }`}
            >
              <div className="px-4 py-4 space-y-3">
                <button
                  onClick={() => router.push('/feed')}
                  className={`block w-full text-left px-4 py-2 rounded-lg transition ${
                    darkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Feed
                </button>
                <button
                  onClick={() => router.push('/search')}
                  className={`block w-full text-left px-4 py-2 rounded-lg transition ${
                    darkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Explore
                </button>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`flex items-center w-full px-4 py-2 rounded-lg transition ${
                    darkMode ? 'text-gray-300 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {darkMode ? <Sun className="w-5 h-5 mr-2" /> : <Moon className="w-5 h-5 mr-2" />}
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section with Dynamic Background */}
      <div className="relative overflow-hidden">
        {/* Animated Background Gradient */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute -top-1/2 -left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [90, 0, 90],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute -bottom-1/2 -right-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* Hero Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-6 backdrop-blur-md ${
                darkMode
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'bg-purple-100 text-purple-700 border border-purple-200'
              }`}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Event Discovery
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`text-5xl sm:text-6xl md:text-7xl font-bold mb-6 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Discover Your Perfect
              </span>
              <br />
              <span className={darkMode ? 'text-white' : 'text-gray-900'}>
                Night Out
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className={`text-xl max-w-2xl mx-auto ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              From hidden jazz clubs to rooftop yoga. All the best independent venues and events, curated by AI.
            </motion.p>
          </motion.div>

          {/* View Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center mb-8"
          >
            <div className={`inline-flex p-1 rounded-2xl backdrop-blur-md ${
              darkMode ? 'bg-white/10 border border-white/20' : 'bg-white/60 border border-gray-200'
            }`}>
              <button
                onClick={() => setActiveView('categories')}
                className={`px-6 py-2 rounded-xl font-medium transition ${
                  activeView === 'categories'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : darkMode
                    ? 'text-gray-300 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveView('search')}
                className={`px-6 py-2 rounded-xl font-medium transition ${
                  activeView === 'search'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : darkMode
                    ? 'text-gray-300 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Search
              </button>
              <button
                onClick={() => router.push('/feed')}
                className={`px-6 py-2 rounded-xl font-medium transition ${
                  activeView === 'feed'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                    : darkMode
                    ? 'text-gray-300 hover:text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Feed
              </button>
            </div>
          </motion.div>

          {/* Dynamic Content Area */}
          <AnimatePresence mode="wait">
            {activeView === 'search' && (
              <motion.div
                key="search"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Search Box with Glassmorphism */}
                <form onSubmit={handleSearch} className="max-w-4xl mx-auto mb-12">
                  <div className={`rounded-2xl shadow-2xl p-2 backdrop-blur-xl ${
                    darkMode
                      ? 'bg-white/10 border border-white/20'
                      : 'bg-white/80 border border-gray-100'
                  }`}>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* City Selector */}
                      <div className={`flex items-center px-4 py-3 border-r ${
                        darkMode ? 'border-white/10' : 'border-gray-200'
                      }`}>
                        <MapPin className={`w-5 h-5 mr-2 flex-shrink-0 ${
                          darkMode ? 'text-gray-400' : 'text-gray-400'
                        }`} />
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className={`bg-transparent border-none outline-none font-medium cursor-pointer ${
                            darkMode ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {cities.map((c) => (
                            <option key={c} value={c} className={darkMode ? 'bg-gray-900' : 'bg-white'}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Search Input */}
                      <div className="flex-1 flex items-center px-4">
                        <Search className={`w-5 h-5 mr-3 ${
                          darkMode ? 'text-gray-400' : 'text-gray-400'
                        }`} />
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Try: 'jazz tonight in Brooklyn' or 'free outdoor events'"
                          className={`flex-1 border-none outline-none bg-transparent ${
                            darkMode
                              ? 'text-white placeholder-gray-400'
                              : 'text-gray-700 placeholder-gray-400'
                          }`}
                        />
                      </div>

                      {/* Search Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        disabled={isSearching}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50"
                      >
                        {isSearching ? 'Searching...' : 'Search'}
                      </motion.button>
                    </div>
                  </div>

                  {/* Popular Searches */}
                  <div className="mt-6 flex flex-wrap gap-2 justify-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Popular:
                    </span>
                    {popularSearches.map((search) => (
                      <motion.button
                        key={search}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setQuery(search)}
                        className={`px-3 py-1 rounded-full text-sm transition backdrop-blur-md ${
                          darkMode
                            ? 'bg-white/10 text-gray-300 hover:bg-purple-500/20 hover:text-purple-300 border border-white/20'
                            : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600 border border-gray-200'
                        }`}
                      >
                        {search}
                      </motion.button>
                    ))}
                  </div>
                </form>
              </motion.div>
            )}

            {activeView === 'categories' && (
              <motion.div
                key="categories"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CategoryPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Features Section with Glassmorphism Cards */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="text-center mb-12">
          <h2 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Why Choose CityPass?
          </h2>
          <p className={`text-xl ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            The most comprehensive, unbiased event discovery platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10, scale: 1.02 }}
              className={`p-6 rounded-2xl backdrop-blur-xl border transition-all ${
                darkMode
                  ? 'bg-white/5 border-white/10 hover:bg-white/10'
                  : 'bg-white/60 border-gray-200 hover:bg-white'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-4`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {feature.title}
              </h3>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center"
          >
            <div className={`text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent`}>
              10,000+
            </div>
            <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              Events Curated
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center"
          >
            <div className={`text-5xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent`}>
              5 Cities
            </div>
            <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              And Growing
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-center"
          >
            <div className={`text-5xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent`}>
              100% Free
            </div>
            <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
              No Subscriptions
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className={`p-12 rounded-3xl backdrop-blur-xl border text-center ${
          darkMode
            ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-white/20'
            : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
        }`}>
          <h2 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Ready to Discover?
          </h2>
          <p className={`text-xl mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Start exploring the best events in your city today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push('/feed')}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition flex items-center justify-center"
            >
              Browse Feed
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveView('search')}
              className={`px-8 py-4 rounded-full font-bold text-lg transition flex items-center justify-center ${
                darkMode
                  ? 'bg-white/10 text-white border-2 border-white/20 hover:bg-white/20'
                  : 'bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Start Searching
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className={`border-t backdrop-blur-xl mt-20 ${
        darkMode
          ? 'bg-black/40 border-white/10'
          : 'bg-white/60 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Sparkles className={`w-6 h-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                CityPass
              </span>
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Built with AI • Powered by Llama 3.1 & Advanced ML
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
