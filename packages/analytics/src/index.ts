/**
 * Analytics SDK - Client-side event tracking with batching and debouncing
 * Respects user consent and sends batched events to the server
 */

export type AnalyticsEventType =
  | 'IMPRESSION'
  | 'VIEW'
  | 'EXPAND'
  | 'SAVE'
  | 'SHARE'
  | 'OUTBOUND_CLICK'
  | 'BOOK_CLICK'
  | 'DISMISS'
  | 'HIDE_VENUE'
  | 'HIDE_CATEGORY'
  | 'REPORT'
  | 'AD_IMPRESSION'
  | 'AD_CLICK'
  | 'AD_VIEWABLE'
  | 'AD_CONVERSION'
  | 'SEARCH'
  | 'FILTER_CHANGE';

export interface AnalyticsEventInput {
  type: AnalyticsEventType;
  eventId?: string;
  adCampaignId?: string;
  adCreativeId?: string;
  props?: Record<string, unknown>;
  city?: string;
}

interface QueuedEvent extends AnalyticsEventInput {
  timestamp: number;
}

class AnalyticsClient {
  private queue: QueuedEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private flushInterval: number = 5000; // 5 seconds
  private maxBatchSize: number = 50;
  private flushTimer: NodeJS.Timeout | null = null;
  private endpoint: string = '/api/track';
  private consentGiven: boolean = false;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.checkConsent();
    this.startFlushTimer();

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush(true));
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush(true);
        }
      });
    }
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private checkConsent(): void {
    if (typeof document === 'undefined') return;

    const cookies = document.cookie.split(';');
    const consentCookie = cookies.find(c => c.trim().startsWith('consent='));
    if (consentCookie) {
      try {
        const consent = JSON.parse(decodeURIComponent(consentCookie.split('=')[1]));
        this.consentGiven = consent.analytics === true;
      } catch {
        this.consentGiven = false;
      }
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setConsent(analytics: boolean): void {
    this.consentGiven = analytics;
    if (!analytics) {
      this.queue = []; // Clear queue if consent revoked
    }
  }

  track(event: AnalyticsEventInput): void {
    if (!this.consentGiven) return;

    this.queue.push({
      ...event,
      timestamp: Date.now(),
    });

    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (typeof window === 'undefined') return;

    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  async flush(useBeacon: boolean = false): Promise<void> {
    if (this.queue.length === 0) return;

    const events = this.queue.splice(0, this.maxBatchSize);
    const payload = {
      sessionId: this.sessionId,
      userId: this.userId,
      events: events.map(e => ({
        type: e.type,
        eventId: e.eventId,
        adCampaignId: e.adCampaignId,
        adCreativeId: e.adCreativeId,
        props: e.props || {},
        city: e.city,
        occurredAt: new Date(e.timestamp).toISOString(),
      })),
    };

    try {
      if (useBeacon && navigator.sendBeacon) {
        // Use sendBeacon for page unload - it's more reliable
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(this.endpoint, blob);
      } else {
        // Normal fetch for regular flushes
        await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: useBeacon, // Keep connection alive for page unload
        });
      }
    } catch (error) {
      // Re-add failed events to queue
      this.queue.unshift(...events);
      console.error('Analytics flush failed:', error);
    }
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(true);
  }
}

// Singleton instance
let analyticsInstance: AnalyticsClient | null = null;

export function getAnalytics(): AnalyticsClient {
  if (!analyticsInstance) {
    analyticsInstance = new AnalyticsClient();
  }
  return analyticsInstance;
}

// Convenience functions
export function track(event: AnalyticsEventInput): void {
  getAnalytics().track(event);
}

export function setUserId(userId: string): void {
  getAnalytics().setUserId(userId);
}

export function setConsent(analytics: boolean): void {
  getAnalytics().setConsent(analytics);
}

// React hook for easy integration
export function useAnalytics() {
  const analytics = getAnalytics();

  return {
    track: (event: AnalyticsEventInput) => analytics.track(event),
    setUserId: (userId: string) => analytics.setUserId(userId),
    setConsent: (consent: boolean) => analytics.setConsent(consent),
  };
}

// Viewability tracking helper
export function trackViewability(
  element: HTMLElement,
  eventData: AnalyticsEventInput,
  threshold: number = 0.5,
  duration: number = 1000
): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};

  let viewTimer: NodeJS.Timeout | null = null;
  let hasTracked = false;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          // Element is visible
          if (!viewTimer && !hasTracked) {
            viewTimer = setTimeout(() => {
              track(eventData);
              hasTracked = true;
            }, duration);
          }
        } else {
          // Element is no longer visible - cancel timer
          if (viewTimer) {
            clearTimeout(viewTimer);
            viewTimer = null;
          }
        }
      });
    },
    { threshold }
  );

  observer.observe(element);

  // Cleanup function
  return () => {
    observer.disconnect();
    if (viewTimer) clearTimeout(viewTimer);
  };
}
