'use client';

import { Suspense, ComponentType, lazy } from 'react';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

interface LazyLoadProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  darkMode?: boolean;
}

/**
 * Lazy load a component with Suspense boundary
 *
 * Usage:
 * ```tsx
 * import LazyLoad from '@/components/LazyLoad';
 *
 * const HeavyComponent = () => import('./HeavyComponent');
 *
 * function MyPage() {
 *   return (
 *     <LazyLoad
 *       component={HeavyComponent}
 *       fallback={<LoadingSkeleton variant="card" />}
 *     />
 *   );
 * }
 * ```
 */
export default function LazyLoad({ component, fallback, darkMode = false }: LazyLoadProps) {
  const Component = lazy(component);

  return (
    <Suspense fallback={fallback || <LoadingSkeleton variant="rectangular" darkMode={darkMode} />}>
      <Component />
    </Suspense>
  );
}

/**
 * Higher-order component for lazy loading
 *
 * Usage:
 * ```tsx
 * import { withLazyLoad } from '@/components/LazyLoad';
 *
 * const HeavyComponent = withLazyLoad(() => import('./HeavyComponent'));
 *
 * function MyPage() {
 *   return <HeavyComponent />;
 * }
 * ```
 */
export function withLazyLoad<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function LazyLoadedComponent(props: P) {
    return (
      <Suspense fallback={fallback || <LoadingSkeleton variant="rectangular" />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Lazy load component when it enters viewport
 *
 * Usage:
 * ```tsx
 * import { LazyLoadOnVisible } from '@/components/LazyLoad';
 *
 * const HeavyComponent = () => import('./HeavyComponent');
 *
 * function MyPage() {
 *   return (
 *     <LazyLoadOnVisible
 *       component={HeavyComponent}
 *       rootMargin="100px"
 *     />
 *   );
 * }
 * ```
 */
export function LazyLoadOnVisible({
  component,
  fallback,
  rootMargin = '0px',
  darkMode = false,
}: LazyLoadProps & { rootMargin?: string }) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref}>
      {isVisible ? (
        <LazyLoad component={component} fallback={fallback} darkMode={darkMode} />
      ) : (
        fallback || <LoadingSkeleton variant="rectangular" darkMode={darkMode} />
      )}
    </div>
  );
}

// Need to import React for hooks
import React from 'react';
