'use client';

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage campaigns, analytics, and platform settings</p>
        </div>

        {/* Quick Actions */}
        <div className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/campaigns"
            className="group rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-lg"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Campaigns</h2>
            <p className="text-sm text-gray-600">Create and manage ad campaigns, budgets, and targeting</p>
          </Link>

          <Link
            href="/admin/analytics"
            className="group rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-lg"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 group-hover:bg-green-200">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">Analytics</h2>
            <p className="text-sm text-gray-600">View real-time metrics, performance data, and insights</p>
          </Link>

          <Link
            href="/"
            className="group rounded-lg bg-white p-6 shadow-md transition-all hover:shadow-lg"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 group-hover:bg-purple-200">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-semibold text-gray-900">User Site</h2>
            <p className="text-sm text-gray-600">Go back to the main CityPass experience</p>
          </Link>
        </div>

        {/* System Info */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">System Information</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-sm font-medium text-gray-600">Platform Version</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">v3.0.0</dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-sm font-medium text-gray-600">Ranking Algorithm</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">Thompson Sampling + LTR</dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-sm font-medium text-gray-600">Ad Engine</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">Second-Price Auction</dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-sm font-medium text-gray-600">Analytics</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">17 Event Types</dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-sm font-medium text-gray-600">Consent Management</dt>
              <dd className="mt-1 text-lg font-semibold text-green-600">GDPR Compliant</dd>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <dt className="text-sm font-medium text-gray-600">Features</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900">17 Ranking Features</dd>
            </div>
          </dl>
        </div>

        {/* Documentation Links */}
        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Documentation</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <span className="font-medium text-blue-600">📊 Ranking System:</span> Uses Thompson Sampling for exploration with 17 features including textual similarity, social proof, and temporal relevance
            </li>
            <li>
              <span className="font-medium text-blue-600">🎯 Ad Platform:</span> Second-price auction with quality scores, contextual targeting, frequency capping, and attribution windows (24h view, 7d click)
            </li>
            <li>
              <span className="font-medium text-blue-600">📈 Analytics:</span> Real-time event tracking with batching, consent management, and viewability measurement
            </li>
            <li>
              <span className="font-medium text-blue-600">🔐 Privacy:</span> GDPR-compliant consent banner with granular controls for analytics, personalization, and advertising
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
