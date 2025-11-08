'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  overview: {
    totalEvents: number;
    totalUsers: number;
    totalSessions: number;
    avgEventsPerSession: number;
  };
  eventBreakdown: {
    type: string;
    count: number;
    percentage: number;
  }[];
  topEvents: {
    eventId: string;
    title: string;
    views: number;
    saves: number;
    conversionRate: number;
  }[];
  adPerformance: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalSpend: number;
    avgCTR: number;
    avgCPC: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`);
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-2 text-gray-600">Real-time metrics and insights</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <Link
              href="/admin"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Total Events</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {formatNumber(data.overview.totalEvents)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Total Users</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {formatNumber(data.overview.totalUsers)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Sessions</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {formatNumber(data.overview.totalSessions)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="text-sm font-medium text-gray-600">Avg Events/Session</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {data.overview.avgEventsPerSession.toFixed(1)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Event Breakdown */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Event Breakdown</h2>
            <div className="space-y-3">
              {data.eventBreakdown.map((item) => (
                <div key={item.type}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.type}</span>
                    <span className="text-gray-600">
                      {formatNumber(item.count)} ({formatPercentage(item.percentage)})
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-600"
                      style={{ width: `${item.percentage * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ad Performance */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Ad Performance</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-sm font-medium text-gray-600">Impressions</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatNumber(data.adPerformance.totalImpressions)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-sm font-medium text-gray-600">Clicks</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatNumber(data.adPerformance.totalClicks)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-sm font-medium text-gray-600">Conversions</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatNumber(data.adPerformance.totalConversions)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-sm font-medium text-gray-600">Total Spend</span>
                <span className="text-lg font-bold text-blue-600">
                  {formatCurrency(data.adPerformance.totalSpend)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-sm font-medium text-gray-600">Avg CTR</span>
                <span className="text-lg font-bold text-green-600">
                  {formatPercentage(data.adPerformance.avgCTR)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Avg CPC</span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(data.adPerformance.avgCPC)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Events */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Top Performing Events</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Event
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Views
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Saves
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Conversion Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.topEvents.map((event) => (
                  <tr key={event.eventId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                      {event.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                      {formatNumber(event.views)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">
                      {formatNumber(event.saves)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-green-600">
                      {formatPercentage(event.conversionRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
