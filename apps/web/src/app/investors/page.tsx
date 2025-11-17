'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Download,
  TrendingUp,
  Zap,
  Brain,
  Database,
  Search,
  Users,
  Target,
  BarChart3,
  Clock,
  Star,
  Moon,
  Sun,
} from 'lucide-react';

export default function InvestorsPage() {
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

  const metrics = [
    {
      label: 'Time to First Plan',
      value: '<8s',
      description: 'Average time for users to receive their first personalized event plan',
      trend: '+32%',
      icon: Clock,
    },
    {
      label: 'Plan Commit Rate',
      value: '68%',
      description: 'Users who save or attend events from their AI-generated plans',
      trend: '+18%',
      icon: Target,
    },
    {
      label: 'Novelty Score',
      value: '0.73',
      description: 'Percentage of recommended events users hadn\'t discovered on their own',
      trend: '+41%',
      icon: Star,
    },
    {
      label: 'Weekly Active Users',
      value: '12.4K',
      description: 'Users actively discovering events each week',
      trend: '+156%',
      icon: TrendingUp,
    },
  ];

  const team = [
    {
      name: 'Engineering',
      role: 'Full-Stack + ML',
      description: 'Building the recommendation engine, RAG pipeline, and conversational AI',
    },
    {
      name: 'Product',
      role: 'Discovery & UX',
      description: 'Designing delightful discovery experiences and user journeys',
    },
    {
      name: 'Growth',
      role: 'Data & Partnerships',
      description: 'Scaling user acquisition and venue partnerships',
    },
  ];

  const traction = [
    {
      period: 'Q4 2024',
      users: 12400,
      events: 8200,
      plans: 34500,
    },
    {
      period: 'Q3 2024',
      users: 8100,
      events: 6800,
      plans: 21300,
    },
    {
      period: 'Q2 2024',
      users: 4800,
      events: 4200,
      plans: 12400,
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
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <h1
            className={`text-5xl sm:text-6xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}
          >
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Reinventing
            </span>{' '}
            Event Discovery
          </h1>
          <p className={`text-xl max-w-3xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            AI-powered platform connecting people with independent venues and hidden cultural gems
          </p>
        </motion.div>

        {/* Problem → Solution → Differentiation */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="grid md:grid-cols-3 gap-8">
            {/* Problem */}
            <div
              className={`p-8 rounded-2xl backdrop-blur-xl border ${
                darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
              }`}
            >
              <div className="text-red-500 mb-4">
                <Target className="w-10 h-10" />
              </div>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                The Problem
              </h3>
              <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Event discovery is broken. Ticketmaster monopolizes major venues with extractive fees. Google
                favors paid ads over quality. Independent venues struggle with discovery despite offering
                authentic experiences.
              </p>
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-red-500/10' : 'bg-red-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                  <strong>Market Gap:</strong> $85B+ event market, no AI-first discovery platform serving
                  independent venues
                </p>
              </div>
            </div>

            {/* Solution */}
            <div
              className={`p-8 rounded-2xl backdrop-blur-xl border ${
                darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
              }`}
            >
              <div className="text-green-500 mb-4">
                <Zap className="w-10 h-10" />
              </div>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Our Solution
              </h3>
              <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                CityLens: Conversational AI agent that understands your mood, context, and preferences. Surfaces
                hidden gems from 10,000+ indie venues using RAG-powered search and LLM reasoning. Zero-fee model
                benefits venues and users.
              </p>
              <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-green-500/10' : 'bg-green-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                  <strong>Tech Edge:</strong> CAG (Conversational Agent Graph) + RAG + Multi-modal ML stack
                </p>
              </div>
            </div>

            {/* Differentiation */}
            <div
              className={`p-8 rounded-2xl backdrop-blur-xl border ${
                darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
              }`}
            >
              <div className="text-blue-500 mb-4">
                <Brain className="w-10 h-10" />
              </div>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Why We Win
              </h3>
              <ul className={`space-y-3 text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>
                    <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Network Effects:</strong>{' '}
                    More users → better recommendations → more venues
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>
                    <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Data Moat:</strong> Proprietary
                    user preference graph + event embeddings
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>
                    <strong className={darkMode ? 'text-white' : 'text-gray-900'}>Alignment:</strong> Zero fees =
                    venues love us, users trust us
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Architecture Diagram */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className={`text-3xl font-bold mb-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Technical Architecture
          </h2>
          <div
            className={`p-8 rounded-2xl backdrop-blur-xl border ${
              darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
            }`}
          >
            {/* SVG Architecture Diagram */}
            <svg
              viewBox="0 0 800 500"
              className="w-full h-auto"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: '#9333ea', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 1 }} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* User Layer */}
              <g>
                <rect
                  x="50"
                  y="50"
                  width="150"
                  height="80"
                  rx="8"
                  fill={darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'}
                  stroke="url(#purpleGrad)"
                  strokeWidth="2"
                />
                <text
                  x="125"
                  y="80"
                  textAnchor="middle"
                  fill={darkMode ? '#fff' : '#000'}
                  fontSize="14"
                  fontWeight="bold"
                >
                  User
                </text>
                <text x="125" y="100" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  Natural Language
                </text>
                <text x="125" y="115" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  Query
                </text>
              </g>

              {/* CAG (Conversational Agent Graph) */}
              <g>
                <rect
                  x="300"
                  y="30"
                  width="200"
                  height="120"
                  rx="8"
                  fill={darkMode ? 'rgba(147,51,234,0.2)' : 'rgba(147,51,234,0.1)'}
                  stroke="#9333ea"
                  strokeWidth="3"
                  filter="url(#glow)"
                />
                <text
                  x="400"
                  y="60"
                  textAnchor="middle"
                  fill={darkMode ? '#fff' : '#000'}
                  fontSize="16"
                  fontWeight="bold"
                >
                  CAG Engine
                </text>
                <text x="400" y="80" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  Conversational Agent
                </text>
                <text x="400" y="95" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  Graph (LangGraph)
                </text>
                <text x="400" y="110" textAnchor="middle" fill="#9333ea" fontSize="10" fontWeight="bold">
                  Llama 3.1 70B
                </text>
                <text x="400" y="125" textAnchor="middle" fill={darkMode ? '#aaa' : '#888'} fontSize="9">
                  Multi-turn reasoning
                </text>
              </g>

              {/* RAG Pipeline */}
              <g>
                <rect
                  x="300"
                  y="180"
                  width="200"
                  height="120"
                  rx="8"
                  fill={darkMode ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)'}
                  stroke="#3b82f6"
                  strokeWidth="3"
                  filter="url(#glow)"
                />
                <text
                  x="400"
                  y="210"
                  textAnchor="middle"
                  fill={darkMode ? '#fff' : '#000'}
                  fontSize="16"
                  fontWeight="bold"
                >
                  RAG Pipeline
                </text>
                <text x="400" y="230" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  Retrieval-Augmented
                </text>
                <text x="400" y="245" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  Generation
                </text>
                <text x="400" y="260" textAnchor="middle" fill="#3b82f6" fontSize="10" fontWeight="bold">
                  Typesense + Embeddings
                </text>
                <text x="400" y="275" textAnchor="middle" fill={darkMode ? '#aaa' : '#888'} fontSize="9">
                  Semantic search
                </text>
              </g>

              {/* Data Layer */}
              <g>
                <rect
                  x="300"
                  y="330"
                  width="200"
                  height="120"
                  rx="8"
                  fill={darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'}
                  stroke={darkMode ? '#666' : '#ccc'}
                  strokeWidth="2"
                />
                <text
                  x="400"
                  y="360"
                  textAnchor="middle"
                  fill={darkMode ? '#fff' : '#000'}
                  fontSize="16"
                  fontWeight="bold"
                >
                  Data Layer
                </text>
                <text x="400" y="380" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  PostgreSQL + Neo4j
                </text>
                <text x="400" y="395" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  10K+ events
                </text>
                <text x="400" y="410" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  User preference graph
                </text>
                <text x="400" y="425" textAnchor="middle" fill={darkMode ? '#aaa' : '#888'} fontSize="9">
                  Similarity edges
                </text>
              </g>

              {/* CityLens UI */}
              <g>
                <rect
                  x="600"
                  y="50"
                  width="150"
                  height="80"
                  rx="8"
                  fill={darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'}
                  stroke="url(#purpleGrad)"
                  strokeWidth="2"
                />
                <text
                  x="675"
                  y="80"
                  textAnchor="middle"
                  fill={darkMode ? '#fff' : '#000'}
                  fontSize="14"
                  fontWeight="bold"
                >
                  CityLens UI
                </text>
                <text x="675" y="100" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  Personalized Feed
                </text>
                <text x="675" y="115" textAnchor="middle" fill={darkMode ? '#ccc' : '#666'} fontSize="11">
                  + Chat Interface
                </text>
              </g>

              {/* Arrows */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3, 0 6" fill={darkMode ? '#888' : '#666'} />
                </marker>
              </defs>

              {/* User → CAG */}
              <line
                x1="200"
                y1="90"
                x2="300"
                y2="90"
                stroke={darkMode ? '#888' : '#666'}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />

              {/* CAG → RAG */}
              <line
                x1="400"
                y1="150"
                x2="400"
                y2="180"
                stroke={darkMode ? '#888' : '#666'}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />

              {/* RAG → Data */}
              <line
                x1="400"
                y1="300"
                x2="400"
                y2="330"
                stroke={darkMode ? '#888' : '#666'}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />

              {/* CAG → CityLens */}
              <line
                x1="500"
                y1="90"
                x2="600"
                y2="90"
                stroke={darkMode ? '#888' : '#666'}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />

              {/* Labels */}
              <text x="250" y="80" fill={darkMode ? '#aaa' : '#888'} fontSize="10">
                Query
              </text>
              <text x="410" y="170" fill={darkMode ? '#aaa' : '#888'} fontSize="10">
                Retrieve
              </text>
              <text x="410" y="320" fill={darkMode ? '#aaa' : '#888'} fontSize="10">
                Events
              </text>
              <text x="550" y="80" fill={darkMode ? '#aaa' : '#888'} fontSize="10">
                Plans
              </text>
            </svg>

            <p className={`mt-6 text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <strong>Data Flow:</strong> User query → CAG reasoning engine → RAG semantic search →
              PostgreSQL/Neo4j → Personalized event plans → CityLens UI
            </p>
          </div>
        </motion.section>

        {/* Key Metrics Dashboard */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className={`text-3xl font-bold mb-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Key Performance Metrics
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-2xl backdrop-blur-xl border ${
                  darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <metric.icon className={`w-8 h-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                  <span className="text-green-500 text-sm font-medium">{metric.trend}</span>
                </div>
                <div className={`text-4xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {metric.value}
                </div>
                <div className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {metric.label}
                </div>
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {metric.description}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Traction */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className={`text-3xl font-bold mb-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Traction & Growth
          </h2>
          <div
            className={`p-8 rounded-2xl backdrop-blur-xl border ${
              darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
            }`}
          >
            <div className="space-y-6">
              {traction.map((quarter, index) => (
                <div key={quarter.period}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {quarter.period}
                    </span>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {quarter.users.toLocaleString()} users
                    </span>
                  </div>
                  <div className="relative h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(quarter.users / 15000) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: index * 0.2 }}
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                    />
                  </div>
                  <div className={`mt-2 flex gap-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <span>{quarter.events.toLocaleString()} events discovered</span>
                    <span>•</span>
                    <span>{quarter.plans.toLocaleString()} AI plans generated</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  156%
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>QoQ User Growth</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  5 Cities
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  NY, SF, LA, CHI, BOS
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  $0
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>User Acquisition Cost</div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Team */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <h2 className={`text-3xl font-bold mb-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Team
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-2xl backdrop-blur-xl border ${
                  darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200'
                }`}
              >
                <div className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {member.name}
                </div>
                <div
                  className={`text-sm font-medium mb-3 ${
                    darkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}
                >
                  {member.role}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {member.description}
                </div>
              </motion.div>
            ))}
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
              Ready to Join Us?
            </h2>
            <p className={`text-xl mb-8 max-w-2xl mx-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              We're building the future of event discovery. Download our investor deck to learn more about our
              vision, traction, and go-to-market strategy.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full font-bold text-lg shadow-xl hover:shadow-2xl transition flex items-center justify-center mx-auto"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Investor Deck
            </motion.button>
            <p className={`mt-4 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Or contact us at{' '}
              <a href="mailto:investors@citypass.com" className="text-purple-600 hover:underline">
                investors@citypass.com
              </a>
            </p>
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
              © 2024 CityPass. Confidential - For Investor Use Only.
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
                onClick={() => router.push('/about')}
                className={`text-sm transition ${
                  darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                About
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
