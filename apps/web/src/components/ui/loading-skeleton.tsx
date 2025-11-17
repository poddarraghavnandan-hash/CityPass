import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  count?: number;
  darkMode?: boolean;
}

export function LoadingSkeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  count = 1,
  darkMode = false,
}: LoadingSkeletonProps) {
  const baseStyles = cn(
    'animate-pulse',
    darkMode ? 'bg-white/10' : 'bg-gray-200',
    className
  );

  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-2xl',
  };

  const defaultDimensions = {
    text: { width: '100%', height: '1rem' },
    circular: { width: '3rem', height: '3rem' },
    rectangular: { width: '100%', height: '8rem' },
    card: { width: '100%', height: '20rem' },
  };

  const dimensions = {
    width: width ?? defaultDimensions[variant].width,
    height: height ?? defaultDimensions[variant].height,
  };

  const skeletons = Array.from({ length: count }, (_, i) => (
    <motion.div
      key={i}
      className={cn(baseStyles, variantStyles[variant])}
      style={dimensions}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: [0.6, 1, 0.6] }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: i * 0.1,
      }}
    />
  ));

  return count > 1 ? <div className="space-y-3">{skeletons}</div> : skeletons[0];
}

/**
 * Pre-built skeleton variants for common use cases
 */

export function EventCardSkeleton({ darkMode = false }: { darkMode?: boolean }) {
  return (
    <div className={cn('p-6 rounded-2xl backdrop-blur-xl border', darkMode ? 'bg-white/5 border-white/10' : 'bg-white/60 border-gray-200')}>
      <div className="flex gap-4">
        <LoadingSkeleton variant="rectangular" width="8rem" height="8rem" darkMode={darkMode} />
        <div className="flex-1 space-y-3">
          <LoadingSkeleton variant="text" width="70%" darkMode={darkMode} />
          <LoadingSkeleton variant="text" width="50%" darkMode={darkMode} />
          <LoadingSkeleton variant="text" width="90%" darkMode={darkMode} />
          <LoadingSkeleton variant="text" width="40%" darkMode={darkMode} />
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ darkMode = false, count = 3 }: { darkMode?: boolean; count?: number }) {
  return (
    <div className="space-y-6">
      {Array.from({ length: count }, (_, i) => (
        <EventCardSkeleton key={i} darkMode={darkMode} />
      ))}
    </div>
  );
}

export function ProfileSkeleton({ darkMode = false }: { darkMode?: boolean }) {
  return (
    <div className="flex items-center gap-4">
      <LoadingSkeleton variant="circular" width="4rem" height="4rem" darkMode={darkMode} />
      <div className="flex-1 space-y-2">
        <LoadingSkeleton variant="text" width="40%" darkMode={darkMode} />
        <LoadingSkeleton variant="text" width="60%" darkMode={darkMode} />
      </div>
    </div>
  );
}

export function GridSkeleton({ darkMode = false, count = 6 }: { darkMode?: boolean; count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <LoadingSkeleton key={i} variant="card" darkMode={darkMode} />
      ))}
    </div>
  );
}
