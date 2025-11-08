'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Campaign {
  id: string;
  name: string;
  advertiser: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  dailyBudget: number;
  totalBudget: number;
  startDate: string;
  endDate: string;
  qualityScore: number;
  _budget?: {
    spent: number;
    impressions: number;
    clicks: number;
    conversions: number;
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      PAUSED: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || colors.ACTIVE;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateCTR = (campaign: Campaign) => {
    const budget = campaign._budget;
    if (!budget || budget.impressions === 0) return '0.00%';
    return ((budget.clicks / budget.impressions) * 100).toFixed(2) + '%';
  };

  const calculateSpendPercentage = (campaign: Campaign) => {
    const budget = campaign._budget;
    if (!budget) return 0;
    return (budget.spent / campaign.totalBudget) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ad Campaigns</h1>
            <p className="mt-2 text-gray-600">Manage your advertising campaigns</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Create Campaign
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {campaigns.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-sm font-medium text-gray-600">Total Campaigns</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">{campaigns.length}</div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-sm font-medium text-gray-600">Active</div>
              <div className="mt-2 text-3xl font-bold text-green-600">
                {campaigns.filter((c) => c.status === 'ACTIVE').length}
              </div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-sm font-medium text-gray-600">Total Budget</div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {formatCurrency(campaigns.reduce((sum, c) => sum + c.totalBudget, 0))}
              </div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-sm font-medium text-gray-600">Total Spend</div>
              <div className="mt-2 text-3xl font-bold text-blue-600">
                {formatCurrency(campaigns.reduce((sum, c) => sum + (c._budget?.spent || 0), 0))}
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Table */}
        {campaigns.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow">
            <div className="text-gray-400">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new campaign.</p>
            <div className="mt-6">
              <button className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Create Campaign
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Quality
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{campaign.name}</div>
                        <div className="text-sm text-gray-500">{campaign.advertiser}</div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusBadge(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900">
                          {formatCurrency(campaign._budget?.spent || 0)} / {formatCurrency(campaign.totalBudget)}
                        </div>
                        <div className="mt-1 h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full bg-blue-600"
                            style={{ width: `${Math.min(calculateSpendPercentage(campaign), 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div>{campaign._budget?.impressions.toLocaleString() || 0} impressions</div>
                        <div className="text-gray-500">{calculateCTR(campaign)} CTR</div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{campaign.qualityScore?.toFixed(1) || '1.0'}</span>
                        <span className="ml-1 text-xs text-gray-500">/ 2.0</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                      <button className="ml-4 text-gray-600 hover:text-gray-900">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
