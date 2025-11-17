'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { getOptimalImageQuality } from '@/lib/performance';

interface OptimizedImageProps extends Omit<ImageProps, 'quality'> {
  fallbackSrc?: string;
  className?: string;
  showLoader?: boolean;
}

/**
 * Optimized Image component with:
 * - Automatic quality adjustment based on network conditions
 * - Lazy loading by default
 * - Blur placeholder
 * - Error handling with fallback
 * - Loading state
 *
 * Usage:
 * ```tsx
 * import { OptimizedImage } from '@/components/OptimizedImage';
 *
 * <OptimizedImage
 *   src="/event.jpg"
 *   alt="Event image"
 *   width={800}
 *   height={600}
 *   fallbackSrc="/placeholder.jpg"
 * />
 * ```
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/placeholder.jpg',
  className,
  showLoader = true,
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const quality = getOptimalImageQuality();

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        {...props}
        src={imgSrc}
        alt={alt}
        quality={quality}
        loading="lazy"
        onLoadingComplete={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
          if (fallbackSrc && imgSrc !== fallbackSrc) {
            setImgSrc(fallbackSrc);
          }
        }}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        placeholder="blur"
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2VlZSIvPjwvc3ZnPg=="
      />

      {/* Loading skeleton */}
      {showLoader && isLoading && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
      )}

      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <span className="text-gray-500 text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
}

/**
 * Optimized background image component
 */
export function OptimizedBackgroundImage({
  src,
  alt = '',
  className,
  children,
  overlay = false,
  overlayOpacity = 0.5,
}: {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayOpacity?: number;
}) {
  return (
    <div className={cn('relative', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="100vw"
        priority={false}
      />
      {overlay && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * Avatar component with optimized image loading
 */
export function Avatar({
  src,
  alt,
  size = 40,
  fallbackText,
  className,
}: {
  src?: string;
  alt: string;
  size?: number;
  fallbackText?: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold',
          className
        )}
        style={{ width: size, height: size, fontSize: size / 2.5 }}
      >
        {fallbackText?.charAt(0).toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <div className={cn('relative rounded-full overflow-hidden', className)} style={{ width: size, height: size }}>
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        onError={() => setHasError(true)}
        sizes={`${size}px`}
      />
    </div>
  );
}
