'use client';

import { useState, useEffect } from 'react';
import { setConsent } from '@citypass/analytics';

interface ConsentStatus {
  analytics: boolean;
  personalization: boolean;
  advertising: boolean;
  grantedAt: string | null;
}

export default function PrivacyPage() {
  const [consent, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    analytics: false,
    personalization: false,
    advertising: false,
  });

  useEffect(() => {
    loadConsent();
  }, []);

  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('citypass_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('citypass_session_id', sessionId);
    }
    return sessionId;
  };

  const loadConsent = async () => {
    setIsLoading(true);

    try {
      const sessionId = getSessionId();
      const response = await fetch(`/api/consent?sessionId=${sessionId}`);
      const data = await response.json();

      if (data.hasConsent) {
        setConsentStatus(data.consent);
        setPreferences({
          analytics: data.consent.analytics,
          personalization: data.consent.personalization,
          advertising: data.consent.advertising,
        });
      }
    } catch (error) {
      console.error('Failed to load consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const sessionId = getSessionId();
      const userId = localStorage.getItem('citypass_user_id') || undefined;

      const response = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          ...preferences,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save consent');
      }

      // Update analytics SDK
      setConsent(preferences.analytics, preferences.personalization, preferences.advertising);

      // Reload consent status
      await loadConsent();

      alert('Privacy preferences saved successfully!');
    } catch (error) {
      console.error('Failed to save consent:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Privacy & Data Controls</h1>
          <p className="mt-2 text-gray-600">
            Manage how CityPass uses your data to personalize your experience.
          </p>
        </div>

        {/* Current Status */}
        {consent && (
          <div className="mb-8 rounded-lg bg-blue-50 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Consent last updated: {new Date(consent.grantedAt || '').toLocaleDateString()}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Preferences */}
        <div className="space-y-6 rounded-lg bg-white p-6 shadow">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Data Collection Preferences</h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose what data CityPass can collect and use.
            </p>
          </div>

          <div className="space-y-6">
            {/* Analytics */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-6">
              <div className="flex-1">
                <label htmlFor="analytics" className="flex cursor-pointer flex-col">
                  <span className="text-base font-medium text-gray-900">Analytics</span>
                  <span className="mt-1 text-sm text-gray-600">
                    We collect anonymized usage data to understand how people use CityPass and improve the service.
                    This includes page views, clicks, and feature usage patterns.
                  </span>
                  <span className="mt-2 text-xs text-gray-500">
                    Data collected: Page views, button clicks, search queries, time on page
                  </span>
                </label>
              </div>
              <div className="ml-6 flex items-center">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    id="analytics"
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                </label>
              </div>
            </div>

            {/* Personalization */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-6">
              <div className="flex-1">
                <label htmlFor="personalization" className="flex cursor-pointer flex-col">
                  <span className="text-base font-medium text-gray-900">Personalization</span>
                  <span className="mt-1 text-sm text-gray-600">
                    We use your activity, saved events, and preferences to recommend events tailored to your interests.
                    This helps you discover events you're more likely to enjoy.
                  </span>
                  <span className="mt-2 text-xs text-gray-500">
                    Data collected: Saved events, dismissed events, category preferences, venue preferences, friend activity
                  </span>
                </label>
              </div>
              <div className="ml-6 flex items-center">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    id="personalization"
                    type="checkbox"
                    checked={preferences.personalization}
                    onChange={(e) => setPreferences({ ...preferences, personalization: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                </label>
              </div>
            </div>

            {/* Advertising */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <label htmlFor="advertising" className="flex cursor-pointer flex-col">
                  <span className="text-base font-medium text-gray-900">Advertising</span>
                  <span className="mt-1 text-sm text-gray-600">
                    We show sponsored content from venues and promoters that matches your interests.
                    Ads help keep CityPass free while supporting local businesses.
                  </span>
                  <span className="mt-2 text-xs text-gray-500">
                    Data collected: Ad impressions, clicks, conversions (saves, shares, bookings)
                  </span>
                </label>
              </div>
              <div className="ml-6 flex items-center">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    id="advertising"
                    type="checkbox"
                    checked={preferences.advertising}
                    onChange={(e) => setPreferences({ ...preferences, advertising: e.target.checked })}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end border-t border-gray-200 pt-6">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-8 space-y-6 rounded-lg bg-white p-6 shadow">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your Privacy Rights</h2>
          </div>

          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900">Access Your Data</h3>
              <p className="mt-1">
                You can request a copy of all data we have collected about you at any time.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Delete Your Data</h3>
              <p className="mt-1">
                You can request deletion of your data. We will permanently remove all personal information
                within 30 days, except where required by law.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Data Security</h3>
              <p className="mt-1">
                We use industry-standard encryption and security practices to protect your data.
                All data is stored securely and access is strictly controlled.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Third-Party Sharing</h3>
              <p className="mt-1">
                We do not sell your personal data to third parties. We only share anonymized,
                aggregated analytics with event organizers to help them understand their audience.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Cookies</h3>
              <p className="mt-1">
                We use first-party cookies to store your session ID and preferences. No third-party
                tracking cookies are used.
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-500">
              For more information, please read our full{' '}
              <a href="/privacy-policy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
              {' '}or contact us at{' '}
              <a href="mailto:privacy@citypass.com" className="text-blue-600 hover:underline">
                privacy@citypass.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
