'use client';

import { useState, useEffect } from 'react';
import { setConsent } from '@citypass/analytics';

interface ConsentPreferences {
  analytics: boolean;
  personalization: boolean;
  advertising: boolean;
}

export function ConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    analytics: true,
    personalization: true,
    advertising: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Check if consent already given
    const checkConsent = async () => {
      const sessionId = getSessionId();

      try {
        const response = await fetch(`/api/consent?sessionId=${sessionId}`);
        const data = await response.json();

        if (!data.hasConsent) {
          // Show banner after short delay
          setTimeout(() => setIsVisible(true), 1000);
        } else {
          // Apply existing consent to analytics SDK
          setConsent(data.consent.analytics);
        }
      } catch (error) {
        console.error('Failed to check consent:', error);
        // Show banner on error to be safe
        setTimeout(() => setIsVisible(true), 1000);
      }
    };

    checkConsent();
  }, []);

  const getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('citypass_session_id');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('citypass_session_id', sessionId);
    }
    return sessionId;
  };

  const handleAcceptAll = async () => {
    await saveConsent({
      analytics: true,
      personalization: true,
      advertising: true,
    });
  };

  const handleRejectAll = async () => {
    await saveConsent({
      analytics: false,
      personalization: false,
      advertising: false,
    });
  };

  const handleSavePreferences = async () => {
    await saveConsent(preferences);
  };

  const saveConsent = async (prefs: ConsentPreferences) => {
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
          ...prefs,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save consent');
      }

      // Update analytics SDK
      setConsent(prefs.analytics);

      // Hide banner
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to save consent:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Your Privacy Matters
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            We use cookies and similar technologies to improve your experience, personalize content,
            and show relevant ads. You can customize your preferences below.
          </p>
        </div>

        {/* Detailed Preferences */}
        {showDetails && (
          <div className="mb-6 space-y-4 rounded-md border border-gray-200 p-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Analytics</div>
                <div className="text-sm text-gray-600">
                  Help us understand how you use CityPass to improve our service.
                  We collect anonymized usage data like page views and clicks.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={preferences.personalization}
                onChange={(e) => setPreferences({ ...preferences, personalization: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Personalization</div>
                <div className="text-sm text-gray-600">
                  Get recommendations tailored to your interests based on your activity,
                  saved events, and preferences.
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={preferences.advertising}
                onChange={(e) => setPreferences({ ...preferences, advertising: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Advertising</div>
                <div className="text-sm text-gray-600">
                  See ads for events and venues that match your interests.
                  We may show sponsored content alongside organic recommendations.
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showDetails ? 'Hide Details' : 'Customize Preferences'}
          </button>

          <div className="flex flex-col gap-2 sm:flex-row">
            {showDetails ? (
              <>
                <button
                  onClick={handleRejectAll}
                  disabled={isSaving}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Reject All
                </button>
                <button
                  onClick={handleSavePreferences}
                  disabled={isSaving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleRejectAll}
                  disabled={isSaving}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Reject All
                </button>
                <button
                  onClick={handleAcceptAll}
                  disabled={isSaving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Accept All'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Privacy Policy Link */}
        <div className="mt-4 text-center text-xs text-gray-500">
          By continuing to use CityPass, you agree to our{' '}
          <a href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
