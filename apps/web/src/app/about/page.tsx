'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Shield,
  Users,
  Zap,
  MapPin,
  Search,
  Calendar,
  Moon,
  Sun,
  TrendingUp,
  Target,
  Compass,
} from 'lucide-react';

export default function AboutPage() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const values = [
    {
      icon: Heart,
      title: 'Independent First',
      description:
        'We prioritize small venues, local artists, and community events over corporate interests',
      gradient: 'from-rose-500 to-pink-500',
    },
    {
      icon: Shield,
      title: 'Zero Fees, Zero Bias',
      description:
        'We never charge fees or accept payments from venues, ensuring unbiased recommendations',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Sparkles,
      title: 'AI for Good',
      description:
        'We use advanced AI to help people discover authentic experiences, not manipulate them',
      gradient: 'from-purple-500 to-violet-500',
    },
    {
      icon: Users,
      title: 'Community Driven',
      description: 'Our recommendations improve with every user interaction and feedback',
      gradient: 'from-green-500 to-emerald-500',
    },
  ];

  const howItWorksSteps = [
    {
      step: 1,
      title: 'Tell Us What You Want',
      description:
        'Use natural language: "jazz tonight in Brooklyn" or "chill outdoor vibes this weekend"',
      icon: Search,
      color: 'purple',
    },
    {
      step: 2,
      title: 'AI Understands Context',
      description:
        'Our LLM reasoning engine interprets your mood, location, timing, and preferences',
      icon: Sparkles,
      color: 'blue',
    },
    {
      step: 3,
      title: 'Discover Hidden Gems',
      description:
        'Get personalized recommendations from 10,000+ indie venues and local events',
      icon: Compass,
      color: 'pink',
    },
    {
      step: 4,
      title: 'Save & Share Plans',
      description: 'Build your night out, share with friends, and book directly with venues',
      icon: Calendar,
      color: 'green',
    },
  ];

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? 'bg-gradient-to-br from-gray-900 via-purple-900/20 to-black'
          : 'bg-gradient-to-br from-purple-50 via-white to-blue-50'
      }`}
    >
      {/* Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors ${
          darkMode ? 'bg-black/40 border-white/10' : 'bg-white/60 border-gray-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/')}
              className={`flex items-center space-x-2 transition ${
                darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-full transition ${
                darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>
          </div>
        </div>
      </motion.nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1 className={`text-5xl sm:text-6xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            About{' '}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              CityPass
            </span>
          </h1>
          <p className={`text-xl max-w-3xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            We're on a mission to help you discover the authentic, independent, and unforgettable experiences
            happening in your city
          </p>
        </motion.div>

        {/* Mission Statement */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div
            className={`p-12 rounded-3xl backdrop-blur-xl border ${
              darkMode
                ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-white/20'
                : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
            }`}
          >
            <div className="text-center max-w-4xl mx-auto">
              <h2 className={`text-3xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Our Mission
              </h2>
              <p className={`text-lg leading-relaxed mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                The best experiences in any city aren't on the first page of Google. They're in small venues,
                independent spaces, and community gatherings that don't have massive marketing budgets.
              </p>
              <p className={`text-lg leading-relaxed mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                We built CityPass to change that. Using AI and machine learning, we surface hidden cultural gems
                and connect people with authentic local experiences they'd never find otherwise.
              </p>
              <p
                className={`text-xl font-semibold ${
                  darkMode ? 'text-purple-400' : 'text-purple-600'
                }`}
              >
                Discovery should be delightful, unbiased, and free for everyone.
              </p>
            </div>
          </div>
        </motion.section>

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className={`text-3xl font-bold mb-12 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            How It Works
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {howItWorksSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`p-8 rounded-2xl backdrop-blur-xl border ${
                  darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-${step.color}-500 to-${step.color}-600 flex items-center justify-center`}
                  >
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium mb-2 ${
                        darkMode ? 'text-purple-400' : 'text-purple-600'
                      }`}
                    >
                      Step {step.step}
                    </div>
                    <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {step.title}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tech Explainer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`mt-8 p-6 rounded-2xl backdrop-blur-xl border ${
              darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
            }`}
          >
            <h3 className={`text-lg font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Powered by Advanced AI
            </h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong className={darkMode ? 'text-white' : 'text-gray-900'}>CityLens</strong> uses a combination
              of large language models (Llama 3.1), retrieval-augmented generation (RAG), and collaborative
              filtering to understand your preferences and surface relevant events. Our conversational agent graph
              (CAG) enables multi-turn dialogue, refining recommendations based on your feedback. The more you use
              it, the better it gets.
            </p>
          </motion.div>
        </motion.section>

        {/* Core Values */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className={`text-3xl font-bold mb-12 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`p-8 rounded-2xl backdrop-blur-xl border ${
                  darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${value.gradient} flex items-center justify-center mb-4`}>
                  <value.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {value.title}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {value.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Privacy Commitment */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div
            className={`p-12 rounded-3xl backdrop-blur-xl border ${
              darkMode
                ? 'bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-white/20'
                : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200'
            }`}
          >
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </div>
              <h2 className={`text-3xl font-bold mb-6 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Your Privacy Matters
              </h2>
              <div className={`space-y-4 text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <p>
                  We take privacy seriously. Here's our commitment:
                </p>
                <ul className="space-y-3 ml-6">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3">✓</span>
                    <span>
                      <strong className={darkMode ? 'text-white' : 'text-gray-900'}>
                        No data selling:
                      </strong>{' '}
                      We never sell your personal data to third parties
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3">✓</span>
                    <span>
                      <strong className={darkMode ? 'text-white' : 'text-gray-900'}>
                        You control your data:
                      </strong>{' '}
                      Request access or deletion of your data anytime
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3">✓</span>
                    <span>
                      <strong className={darkMode ? 'text-white' : 'text-gray-900'}>
                        Transparent usage:
                      </strong>{' '}
                      We only collect what's needed to improve recommendations
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-3">✓</span>
                    <span>
                      <strong className={darkMode ? 'text-white' : 'text-gray-900'}>
                        Opt-in analytics:
                      </strong>{' '}
                      You choose what data we can use for analytics
                    </span>
                  </li>
                </ul>
                <p className="mt-6 text-center">
                  <button
                    onClick={() => router.push('/privacy')}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Manage your privacy settings →
                  </button>
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* The Difference */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className={`text-3xl font-bold mb-12 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            What Makes Us Different
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Platforms */}
            <div
              className={`p-8 rounded-2xl backdrop-blur-xl border ${
                darkMode ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'
              }`}
            >
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                Traditional Platforms
              </h3>
              <ul className={`space-y-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>Pay-to-play ranking (highest bidder wins)</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>30-50% fees on ticket sales</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>Focus on corporate venues and major events</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>Generic recommendations based on trending data</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2">✗</span>
                  <span>Data sold to advertisers and third parties</span>
                </li>
              </ul>
            </div>

            {/* CityPass */}
            <div
              className={`p-8 rounded-2xl backdrop-blur-xl border ${
                darkMode
                  ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-purple-500/20'
                  : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
              }`}
            >
              <h3
                className={`text-xl font-bold mb-4 ${
                  darkMode ? 'text-purple-400' : 'text-purple-700'
                }`}
              >
                CityPass
              </h3>
              <ul className={`space-y-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>AI-powered, unbiased recommendations</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Zero fees for venues and users</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Independent venues and local artists first</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Personalized to your taste and context</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Your data stays private and under your control</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div
            className={`p-12 rounded-3xl backdrop-blur-xl border ${
              darkMode
                ? 'bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-white/20'
                : 'bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200'
            }`}
          >
            <h2 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Ready to Discover?
            </h2>
            <p className={`text-xl mb-8 max-w-2xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Join thousands of people discovering authentic experiences in their city
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/feed')}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition"
              >
                Try CityLens
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/search')}
                className={`px-8 py-4 rounded-full font-bold text-lg transition ${
                  darkMode
                    ? 'bg-white/10 text-white border-2 border-white/20 hover:bg-white/20'
                    : 'bg-white text-gray-900 border-2 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Explore Events
              </motion.button>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Footer */}
      <footer
        className={`border-t backdrop-blur-xl mt-20 ${
          darkMode ? 'bg-black/40 border-white/10' : 'bg-white/60 border-gray-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              © 2024 CityPass. Built with ❤️ for independent culture.
            </div>
            <div className="flex gap-6">
              <button
                onClick={() => router.push('/')}
                className={`text-sm transition ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => router.push('/investors')}
                className={`text-sm transition ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Investors
              </button>
              <button
                onClick={() => router.push('/privacy')}
                className={`text-sm transition ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Privacy
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
