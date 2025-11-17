import { Metadata } from 'next';

/**
 * Site configuration for SEO metadata
 */
export const siteConfig = {
  name: 'CityPass',
  description: 'Your AI-powered guide to discovering the perfect events in your city. From live music and comedy to food festivals and wellness classes - find experiences that match your mood and preferences.',
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://citypass.com',
  ogImage: '/og-image.png',
  creator: 'CityPass Team',
  keywords: [
    'events',
    'city events',
    'concerts',
    'comedy shows',
    'live music',
    'things to do',
    'event discovery',
    'AI recommendations',
    'personalized events',
    'event planning',
    'nightlife',
    'cultural events',
    'entertainment',
  ],
  links: {
    twitter: 'https://twitter.com/citypass',
    github: 'https://github.com/citypass',
  },
};

/**
 * Default metadata for the entire site
 */
export const defaultMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  authors: [
    {
      name: siteConfig.creator,
    },
  ],
  creator: siteConfig.creator,
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: '@citypass',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

/**
 * Generate metadata for event-related pages
 */
export function generateEventMetadata({
  title,
  description,
  path,
  imageUrl,
}: {
  title: string;
  description?: string;
  path: string;
  imageUrl?: string;
}): Metadata {
  const url = `${siteConfig.url}${path}`;
  const ogImage = imageUrl || siteConfig.ogImage;

  return {
    title,
    description: description || siteConfig.description,
    openGraph: {
      type: 'article',
      url,
      title,
      description: description || siteConfig.description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || siteConfig.description,
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Generate JSON-LD structured data for an event
 */
export function generateEventJsonLd(event: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  image?: string;
  url?: string;
  organizer?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate || event.startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.location.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location.address,
        addressLocality: event.location.city,
        addressCountry: 'US',
      },
      ...(event.location.latitude && event.location.longitude
        ? {
            geo: {
              '@type': 'GeoCoordinates',
              latitude: event.location.latitude,
              longitude: event.location.longitude,
            },
          }
        : {}),
    },
    image: event.image ? [event.image] : [],
    ...(event.url ? { url: event.url } : {}),
    ...(event.organizer
      ? {
          organizer: {
            '@type': 'Organization',
            name: event.organizer,
          },
        }
      : {}),
    ...(event.priceMin !== undefined || event.priceMax !== undefined
      ? {
          offers: {
            '@type': 'Offer',
            ...(event.priceMin !== undefined && event.priceMin === 0
              ? {
                  price: '0',
                  priceCurrency: event.currency || 'USD',
                  availability: 'https://schema.org/InStock',
                }
              : {
                  lowPrice: event.priceMin,
                  highPrice: event.priceMax || event.priceMin,
                  priceCurrency: event.currency || 'USD',
                  availability: 'https://schema.org/InStock',
                }),
          },
        }
      : {}),
  };
}

/**
 * Generate JSON-LD structured data for organization
 */
export function generateOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [siteConfig.links.twitter, siteConfig.links.github],
  };
}

/**
 * Generate JSON-LD structured data for website
 */
export function generateWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
