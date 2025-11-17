# Performance & SEO Enhancements

This document outlines all performance optimizations and SEO enhancements implemented in the CityPass web application.

## Table of Contents

1. [SEO Enhancements](#seo-enhancements)
2. [Performance Optimizations](#performance-optimizations)
3. [Monitoring & Analytics](#monitoring--analytics)
4. [Best Practices](#best-practices)

---

## SEO Enhancements

### 1. Comprehensive Metadata System

**File:** `apps/web/src/lib/metadata.ts`

- **Site-wide configuration** with default OpenGraph and Twitter Card tags
- **Dynamic metadata generation** for event pages with canonical URLs
- **JSON-LD structured data** for events, organization, and website
- **Automatic SEO optimization** for all pages

#### Features:
- OpenGraph meta tags for social media sharing
- Twitter Card support for enhanced Twitter previews
- Rich snippets with JSON-LD for better search visibility
- Canonical URLs to prevent duplicate content issues
- Customizable metadata per page/route

### 2. Dynamic Sitemap

**File:** `apps/web/src/app/sitemap.ts`

Automatically generates XML sitemap with:
- All static pages (home, about, feed, explore, saved, settings)
- City-specific pages (New York, San Francisco, Los Angeles, Chicago, Boston)
- Category pages (music, comedy, theatre, fitness, dance, arts, food, networking, family)
- Change frequency and priority hints for search engines
- Automatic updates when new routes are added

**Access:** `https://citypass.com/sitemap.xml`

### 3. Robots.txt Configuration

**File:** `apps/web/src/app/robots.ts`

Dynamic robots.txt generation with:
- Allows all pages except API routes and admin areas
- Blocks investor page from search engines (private content)
- Blocks AI crawlers (GPTBot, ChatGPT-User, Google-Extended, anthropic-ai)
- Sitemap reference for search engines

**Access:** `https://citypass.com/robots.txt`

### 4. Page-Specific Metadata

Enhanced metadata for key pages:

**Landing Page** (`apps/web/src/app/layout.tsx`):
- Comprehensive site description
- Keyword optimization
- Author and creator attribution
- JSON-LD structured data for Organization and Website

**Investors Page** (`apps/web/src/app/investors/layout.tsx`):
- NoIndex directive (private content)
- Investor-specific description
- Proper OpenGraph tags

**About Page** (`apps/web/src/app/about/layout.tsx`):
- SEO-optimized description
- Mission-focused content
- OpenGraph and Twitter Card support

### 5. PWA Manifest

**File:** `apps/web/public/site.webmanifest`

Progressive Web App support with:
- App name, icons, and theme colors
- Standalone display mode for app-like experience
- Shortcuts to key features (Discover, Explore, Saved)
- Screenshots for app stores
- Categories and orientation settings

---

## Performance Optimizations

### 1. Next.js Configuration

**File:** `apps/web/next.config.js`

Enhanced with:
- **Image optimization:** AVIF and WebP formats, responsive sizes, caching
- **Compression:** Enabled gzip/brotli compression
- **SWC minification:** Faster builds with Rust-based compiler
- **Font optimization:** Automatic font subsetting and preloading
- **React strict mode:** Better development experience
- **Removed powered-by header:** Security improvement

### 2. Font Optimization

**File:** `apps/web/src/app/layout.tsx`

Optimized Google Font loading:
```typescript
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent FOIT (Flash of Invisible Text)
  preload: true,   // Preload critical font
});
```

### 3. Performance Monitoring Library

**File:** `apps/web/src/lib/performance.ts`

Comprehensive utilities for:
- **Web Vitals tracking:** LCP, FID, CLS, FCP, TTFB, INP
- **Long task detection:** Identify performance bottlenecks
- **Resource preloading:** Preload critical assets
- **Connection-aware loading:** Adjust quality based on network speed
- **Memory monitoring:** Track JavaScript heap usage
- **Custom metrics:** Measure specific operations

### 4. Web Vitals Component

**File:** `apps/web/src/components/WebVitals.tsx`

Two components:
1. **WebVitals** - Silent monitoring for production
2. **PerformanceMonitor** - Visual dashboard for development

Tracks all Core Web Vitals:
- **LCP** (Largest Contentful Paint): Good < 2.5s
- **FID** (First Input Delay): Good < 100ms
- **CLS** (Cumulative Layout Shift): Good < 0.1
- **FCP** (First Contentful Paint): Good < 1.8s
- **TTFB** (Time to First Byte): Good < 800ms
- **INP** (Interaction to Next Paint): Good < 200ms

### 5. Lazy Loading Components

**File:** `apps/web/src/components/LazyLoad.tsx`

Three lazy loading strategies:

1. **LazyLoad** - Basic code splitting with Suspense
2. **withLazyLoad** - HOC for lazy loading
3. **LazyLoadOnVisible** - Viewport-based lazy loading

Benefits:
- Reduced initial bundle size
- Faster Time to Interactive (TTI)
- On-demand loading for better perceived performance

### 6. Optimized Image Component

**File:** `apps/web/src/components/OptimizedImage.tsx`

Features:
- **Automatic quality adjustment** based on network conditions
- **Lazy loading** by default
- **Blur placeholder** for better UX
- **Error handling** with fallback images
- **Loading states** with skeleton
- **Avatar component** with fallback initials
- **Background image** with overlay support

Usage:
```typescript
<OptimizedImage
  src="/event.jpg"
  alt="Event"
  width={800}
  height={600}
  fallbackSrc="/placeholder.jpg"
/>
```

### 7. Instrumentation

**File:** `apps/web/src/app/instrumentation.ts`

Server-side monitoring:
- Request error tracking
- Performance monitoring hooks
- Ready for Sentry/DataDog integration

---

## Monitoring & Analytics

### Web Vitals Reporting

All Core Web Vitals are automatically tracked and can be sent to:
- Google Analytics
- Custom analytics endpoint
- Error tracking services (Sentry, etc.)

### Performance Observability

- Long task detection (tasks > 50ms)
- Memory usage monitoring
- Navigation timing metrics
- Resource loading performance

### Development Tools

**PerformanceMonitor component** shows real-time metrics during development:
- Color-coded indicators (green/yellow/red)
- Live updates as you navigate
- Helps identify performance issues early

---

## Best Practices

### Images

1. **Always use OptimizedImage component** instead of regular `<img>` tags
2. **Provide proper width/height** to prevent CLS
3. **Use fallback images** for better error handling
4. **Add descriptive alt text** for accessibility and SEO

### Code Splitting

1. **Use LazyLoad for large components** (charts, maps, heavy UI)
2. **Lazy load below-the-fold content** with LazyLoadOnVisible
3. **Split by route** - Next.js does this automatically

### Metadata

1. **Add metadata to every page** using layouts or generateMetadata
2. **Include JSON-LD structured data** for events
3. **Use canonical URLs** to prevent duplicate content
4. **Update sitemap** when adding new routes

### Performance

1. **Monitor Web Vitals** regularly
2. **Keep bundles small** (< 200KB initial JS)
3. **Optimize images** (use next/image)
4. **Minimize third-party scripts**
5. **Use CDN for static assets**

### SEO

1. **Unique titles and descriptions** for each page
2. **Semantic HTML** (proper heading hierarchy)
3. **Mobile-friendly** design
4. **Fast loading times** (target < 3s)
5. **HTTPS everywhere**

---

## Performance Targets

### Core Web Vitals Goals

| Metric | Target | Current |
|--------|--------|---------|
| LCP | < 2.5s | Monitoring |
| FID | < 100ms | Monitoring |
| CLS | < 0.1 | Monitoring |
| FCP | < 1.8s | Monitoring |
| TTFB | < 800ms | Monitoring |
| INP | < 200ms | Monitoring |

### Bundle Size Goals

| Bundle | Target | Current |
|--------|--------|---------|
| Initial JS | < 200KB | Monitoring |
| Total JS | < 500KB | Monitoring |
| CSS | < 50KB | Monitoring |

### Lighthouse Scores Goals

| Category | Target |
|----------|--------|
| Performance | > 90 |
| Accessibility | > 95 |
| Best Practices | > 95 |
| SEO | 100 |

---

## Testing

### SEO Testing

1. **Google Search Console** - Monitor indexing and search performance
2. **Structured Data Testing Tool** - Validate JSON-LD
3. **Mobile-Friendly Test** - Ensure mobile compatibility
4. **PageSpeed Insights** - Check Core Web Vitals

### Performance Testing

1. **Lighthouse** (Chrome DevTools) - Comprehensive audit
2. **WebPageTest** - Real-world performance testing
3. **Chrome DevTools Performance tab** - Detailed profiling
4. **Network tab** - Check resource loading

### Commands

```bash
# Build and analyze bundle
pnpm build
pnpm analyze

# Check for accessibility issues
pnpm lint

# Test on different devices (Chrome DevTools)
Open DevTools → Toggle device toolbar

# Run Lighthouse audit
Open DevTools → Lighthouse tab → Generate report
```

---

## Future Enhancements

### Planned Optimizations

1. **Service Worker** - Offline support and caching
2. **HTTP/2 Server Push** - Push critical resources
3. **Resource hints** - dns-prefetch, preconnect
4. **Critical CSS extraction** - Inline critical styles
5. **Font subsetting** - Reduce font file sizes
6. **Image CDN integration** - Cloudinary/Imgix
7. **Analytics integration** - Google Analytics 4
8. **Error tracking** - Sentry setup
9. **A/B testing framework** - Optimize conversion
10. **Server-side caching** - Redis for API responses

### Monitoring Improvements

1. **Real User Monitoring (RUM)** - Track real user performance
2. **Synthetic monitoring** - Automated performance checks
3. **Error budgets** - Alert when performance degrades
4. **Performance budgets** - Prevent bundle bloat

---

## Resources

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web Vitals](https://web.dev/vitals/)
- [Google Search Central](https://developers.google.com/search)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse)
- [Schema.org](https://schema.org/)

---

## Support

For questions or issues related to performance and SEO:

1. Check the [Next.js docs](https://nextjs.org/docs)
2. Review this document
3. Run Lighthouse audit
4. Check browser DevTools Performance tab
