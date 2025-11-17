'use client';

import { useEffect } from 'react';
import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVitals, observeLongTasks } from '@/lib/performance';

/**
 * Web Vitals monitoring component
 *
 * Add this to your root layout to track Core Web Vitals:
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - FCP (First Contentful Paint)
 * - TTFB (Time to First Byte)
 * - INP (Interaction to Next Paint)
 *
 * Usage:
 * ```tsx
 * import { WebVitals } from '@/components/WebVitals';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <WebVitals />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    reportWebVitals(metric);
  });

  useEffect(() => {
    // Observe long tasks in the browser
    observeLongTasks();

    // Log initial performance metrics
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        console.log('[Performance] Navigation Timing:', {
          'DNS Lookup': `${(navigation.domainLookupEnd - navigation.domainLookupStart).toFixed(2)}ms`,
          'TCP Connection': `${(navigation.connectEnd - navigation.connectStart).toFixed(2)}ms`,
          'Request Time': `${(navigation.responseStart - navigation.requestStart).toFixed(2)}ms`,
          'Response Time': `${(navigation.responseEnd - navigation.responseStart).toFixed(2)}ms`,
          'DOM Processing': `${(navigation.domComplete - navigation.domInteractive).toFixed(2)}ms`,
          'Total Load Time': `${(navigation.loadEventEnd - navigation.fetchStart).toFixed(2)}ms`,
        });
      }
    }
  }, []);

  return null;
}

/**
 * Performance monitoring component for development
 * Shows a floating performance panel in development mode
 */
export function PerformanceMonitor() {
  const [metrics, setMetrics] = React.useState<{
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
    inp?: number;
  }>({});

  useReportWebVitals((metric) => {
    setMetrics((prev) => ({
      ...prev,
      [metric.name.toLowerCase()]: metric.value,
    }));
  });

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] bg-black/90 text-white text-xs p-4 rounded-lg backdrop-blur-xl border border-white/10 font-mono max-w-xs">
      <div className="font-bold mb-2 text-purple-400">Core Web Vitals</div>
      <div className="space-y-1">
        {metrics.lcp && (
          <div className="flex justify-between">
            <span>LCP:</span>
            <span className={metrics.lcp > 2500 ? 'text-red-400' : metrics.lcp > 1000 ? 'text-yellow-400' : 'text-green-400'}>
              {metrics.lcp.toFixed(0)}ms
            </span>
          </div>
        )}
        {metrics.fid && (
          <div className="flex justify-between">
            <span>FID:</span>
            <span className={metrics.fid > 100 ? 'text-red-400' : metrics.fid > 50 ? 'text-yellow-400' : 'text-green-400'}>
              {metrics.fid.toFixed(0)}ms
            </span>
          </div>
        )}
        {metrics.cls && (
          <div className="flex justify-between">
            <span>CLS:</span>
            <span className={metrics.cls > 0.25 ? 'text-red-400' : metrics.cls > 0.1 ? 'text-yellow-400' : 'text-green-400'}>
              {metrics.cls.toFixed(3)}
            </span>
          </div>
        )}
        {metrics.fcp && (
          <div className="flex justify-between">
            <span>FCP:</span>
            <span className={metrics.fcp > 1800 ? 'text-red-400' : metrics.fcp > 1000 ? 'text-yellow-400' : 'text-green-400'}>
              {metrics.fcp.toFixed(0)}ms
            </span>
          </div>
        )}
        {metrics.ttfb && (
          <div className="flex justify-between">
            <span>TTFB:</span>
            <span className={metrics.ttfb > 800 ? 'text-red-400' : metrics.ttfb > 400 ? 'text-yellow-400' : 'text-green-400'}>
              {metrics.ttfb.toFixed(0)}ms
            </span>
          </div>
        )}
        {metrics.inp && (
          <div className="flex justify-between">
            <span>INP:</span>
            <span className={metrics.inp > 200 ? 'text-red-400' : metrics.inp > 100 ? 'text-yellow-400' : 'text-green-400'}>
              {metrics.inp.toFixed(0)}ms
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 text-[10px] text-gray-500">
        Green: Good | Yellow: Needs Improvement | Red: Poor
      </div>
    </div>
  );
}

// Need to import React for hooks
import React from 'react';
