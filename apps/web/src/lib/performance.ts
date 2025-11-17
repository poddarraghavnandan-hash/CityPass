/**
 * Performance monitoring and optimization utilities for CityPass
 */

/**
 * Report Web Vitals to analytics
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/analytics
 */
export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: 'web-vital' | 'custom';
  startTime?: number;
}) {
  // In production, send to your analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        event_category: metric.label === 'web-vital' ? 'Web Vitals' : 'Custom Metrics',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    }

    // Example: Send to custom analytics endpoint
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   body: JSON.stringify(metric),
    //   headers: { 'Content-Type': 'application/json' },
    // });
  } else {
    // Log in development
    console.log('[Performance]', metric.name, metric.value);
  }
}

/**
 * Measure and report custom performance metrics
 */
export function measurePerformance(name: string, startTime: number) {
  const duration = performance.now() - startTime;
  reportWebVitals({
    id: `${name}-${Date.now()}`,
    name,
    value: duration,
    label: 'custom',
    startTime,
  });
  return duration;
}

/**
 * Create a performance observer for tracking long tasks
 */
export function observeLongTasks() {
  if (typeof window === 'undefined') return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          // Long task threshold
          console.warn('[Performance] Long task detected:', {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          });

          reportWebVitals({
            id: `long-task-${Date.now()}`,
            name: 'LONG_TASK',
            value: entry.duration,
            label: 'custom',
            startTime: entry.startTime,
          });
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
  } catch (e) {
    // PerformanceObserver not supported
    console.log('[Performance] PerformanceObserver not supported');
  }
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, type: 'script' | 'style' | 'font' | 'image') {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;

  if (type === 'script') {
    link.as = 'script';
  } else if (type === 'style') {
    link.as = 'style';
  } else if (type === 'font') {
    link.as = 'font';
    link.crossOrigin = 'anonymous';
  } else if (type === 'image') {
    link.as = 'image';
  }

  document.head.appendChild(link);
}

/**
 * Lazy load images with intersection observer
 */
export function lazyLoadImage(img: HTMLImageElement) {
  if (typeof window === 'undefined') return;

  if ('loading' in HTMLImageElement.prototype) {
    // Native lazy loading
    img.loading = 'lazy';
  } else {
    // Fallback to Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLImageElement;
            const src = target.dataset.src;
            if (src) {
              target.src = src;
              observer.unobserve(target);
            }
          }
        });
      },
      { rootMargin: '50px' }
    );

    observer.observe(img);
  }
}

/**
 * Prefetch route for better navigation performance
 */
export function prefetchRoute(url: string) {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Check if the user's connection is slow
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined' || !(navigator as any).connection) {
    return false;
  }

  const connection = (navigator as any).connection;
  const effectiveType = connection.effectiveType;

  // Consider 2G and slow 3G as slow
  return effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
}

/**
 * Check if the user has data saver enabled
 */
export function hasDataSaver(): boolean {
  if (typeof navigator === 'undefined' || !(navigator as any).connection) {
    return false;
  }

  const connection = (navigator as any).connection;
  return connection.saveData === true;
}

/**
 * Get optimal image quality based on connection
 */
export function getOptimalImageQuality(): number {
  if (isSlowConnection() || hasDataSaver()) {
    return 50; // Lower quality for slow connections
  }
  return 80; // Default quality
}

/**
 * Defer non-critical scripts
 */
export function deferScript(src: string, onLoad?: () => void) {
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.src = src;
  script.defer = true;
  if (onLoad) {
    script.onload = onLoad;
  }
  document.body.appendChild(script);
}

/**
 * Memory usage monitoring (Chrome only)
 */
export function monitorMemoryUsage() {
  if (typeof window === 'undefined') return;

  const memory = (performance as any).memory;
  if (!memory) {
    console.log('[Performance] Memory API not available');
    return;
  }

  const usedMemoryMB = memory.usedJSHeapSize / 1048576;
  const totalMemoryMB = memory.totalJSHeapSize / 1048576;
  const limitMemoryMB = memory.jsHeapSizeLimit / 1048576;

  console.log('[Performance] Memory Usage:', {
    used: `${usedMemoryMB.toFixed(2)} MB`,
    total: `${totalMemoryMB.toFixed(2)} MB`,
    limit: `${limitMemoryMB.toFixed(2)} MB`,
    percentage: `${((usedMemoryMB / limitMemoryMB) * 100).toFixed(2)}%`,
  });

  // Warn if using more than 80% of available memory
  if (usedMemoryMB / limitMemoryMB > 0.8) {
    console.warn('[Performance] High memory usage detected!');
  }
}
