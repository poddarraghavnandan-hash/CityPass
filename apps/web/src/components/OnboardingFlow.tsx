'use client';

import { useState } from 'react';
import { X, Music, Utensils, Theater, Dumbbell, Coffee, Users, Sparkles } from 'lucide-react';

interface OnboardingFlowProps {
  onComplete: (preferences: UserPreferences) => void;
  onSkip: () => void;
}

interface UserPreferences {
  favoriteCategories: string[];
  pricePreference: 'free' | 'budget' | 'moderate' | 'premium' | 'any';
  timePreference: 'morning' | 'afternoon' | 'evening' | 'night' | 'any';
  groupSize: 'solo' | 'couple' | 'small-group' | 'large-group' | 'any';
  discoveryMode: 'popular' | 'hidden-gems' | 'balanced';
}

const CATEGORIES = [
  { id: 'MUSIC', label: 'Music & Concerts', icon: Music, color: 'bg-purple-100 hover:bg-purple-200' },
  { id: 'FOOD_DRINK', label: 'Food & Drink', icon: Utensils, color: 'bg-orange-100 hover:bg-orange-200' },
  { id: 'ARTS', label: 'Arts & Culture', icon: Theater, color: 'bg-pink-100 hover:bg-pink-200' },
  { id: 'FITNESS', label: 'Fitness & Sports', icon: Dumbbell, color: 'bg-blue-100 hover:bg-blue-200' },
  { id: 'NIGHTLIFE', label: 'Nightlife & Bars', icon: Sparkles, color: 'bg-indigo-100 hover:bg-indigo-200' },
  { id: 'NETWORKING', label: 'Networking & Social', icon: Users, color: 'bg-green-100 hover:bg-green-200' },
  { id: 'WELLNESS', label: 'Wellness & Spa', icon: Coffee, color: 'bg-teal-100 hover:bg-teal-200' },
  { id: 'COMEDY', label: 'Comedy & Theatre', icon: Theater, color: 'bg-yellow-100 hover:bg-yellow-200' },
];

export function OnboardingFlow({ onComplete, onSkip }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pricePreference, setPricePreference] = useState<UserPreferences['pricePreference']>('any');
  const [timePreference, setTimePreference] = useState<UserPreferences['timePreference']>('any');
  const [groupSize, setGroupSize] = useState<UserPreferences['groupSize']>('any');
  const [discoveryMode, setDiscoveryMode] = useState<UserPreferences['discoveryMode']>('balanced');

  const totalSteps = 5;

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    onComplete({
      favoriteCategories: selectedCategories.length > 0 ? selectedCategories : ['MUSIC', 'FOOD_DRINK', 'NIGHTLIFE'],
      pricePreference,
      timePreference,
      groupSize,
      discoveryMode,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome to CityPass</h2>
            <p className="text-sm text-gray-600">Tell us what you love, we'll show you the best</p>
          </div>
          <button
            onClick={onSkip}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Skip onboarding"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {step}/{totalSteps}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  What are you interested in?
                </h3>
                <p className="text-gray-600">Select all that apply</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategories.includes(category.id);

                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${category.color}`}
                    >
                      <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                      <div className="text-sm font-medium text-gray-900">{category.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  What's your budget preference?
                </h3>
                <p className="text-gray-600">We'll show you the best options in your range</p>
              </div>

              <div className="space-y-3">
                {[
                  { value: 'free' as const, label: 'Free Events', desc: 'Free admission only' },
                  { value: 'budget' as const, label: 'Budget-Friendly', desc: 'Under $20' },
                  { value: 'moderate' as const, label: 'Moderate', desc: '$20-$50' },
                  { value: 'premium' as const, label: 'Premium', desc: '$50+' },
                  { value: 'any' as const, label: 'Any Price', desc: 'Show me everything' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPricePreference(option.value)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      pricePreference === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  When do you usually go out?
                </h3>
                <p className="text-gray-600">We'll prioritize events at your preferred times</p>
              </div>

              <div className="space-y-3">
                {[
                  { value: 'morning' as const, label: 'Morning Person', desc: 'Before 12 PM' },
                  { value: 'afternoon' as const, label: 'Afternoon Explorer', desc: '12 PM - 5 PM' },
                  { value: 'evening' as const, label: 'Evening Out', desc: '5 PM - 10 PM' },
                  { value: 'night' as const, label: 'Night Owl', desc: 'After 10 PM' },
                  { value: 'any' as const, label: 'Flexible', desc: 'Anytime works' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimePreference(option.value)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      timePreference === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Who do you usually go with?
                </h3>
                <p className="text-gray-600">Help us find the right vibe</p>
              </div>

              <div className="space-y-3">
                {[
                  { value: 'solo' as const, label: 'Flying Solo', desc: 'Just me' },
                  { value: 'couple' as const, label: 'Date Night', desc: 'Me + 1' },
                  { value: 'small-group' as const, label: 'Small Group', desc: '3-6 people' },
                  { value: 'large-group' as const, label: 'Large Group', desc: '7+ people' },
                  { value: 'any' as const, label: 'It Varies', desc: 'Depends on the event' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setGroupSize(option.value)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      groupSize === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  How do you discover events?
                </h3>
                <p className="text-gray-600">Choose your exploration style</p>
              </div>

              <div className="space-y-3">
                {[
                  { value: 'popular' as const, label: 'Popular Picks', desc: 'Show me what is trending and highly rated' },
                  { value: 'hidden-gems' as const, label: 'Hidden Gems', desc: 'I want to discover unique, lesser-known events' },
                  { value: 'balanced' as const, label: 'Best of Both', desc: 'Mix of popular and hidden gems' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setDiscoveryMode(option.value)}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      discoveryMode === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          <button
            onClick={handleNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {step === totalSteps ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
