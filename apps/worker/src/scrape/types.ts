/**
 * Scraper Types
 * Common interfaces for event scraping from various sources
 */

export interface ScraperConfig {
  source: EventSource;
  city: string;
  apiKey?: string;
  maxResults?: number;
  daysAhead?: number;
}

export type EventSource =
  | 'eventbrite'
  | 'meetup'
  | 'residentadvisor'
  | 'timeout'
  | 'manual';

export interface RawEvent {
  sourceId: string;
  sourceUrl: string;
  sourceUpdatedAt?: Date;
  title: string;
  description?: string;
  venueName?: string;
  address?: string;
  city: string;
  lat?: number;
  lon?: number;
  startTime: Date;
  endTime?: Date;
  category?: string;
  tags?: string[];
  priceMin?: number;
  priceMax?: number;
  imageUrl?: string;
  bookingUrl?: string;
  organizerName?: string;
  organizerId?: string;
}

export interface ScraperResult {
  source: EventSource;
  city: string;
  events: RawEvent[];
  scrapedAt: Date;
  errors: string[];
  metadata?: Record<string, any>;
}

export interface ScraperStats {
  totalScraped: number;
  newEvents: number;
  updatedEvents: number;
  skippedEvents: number;
  errors: number;
  durationMs: number;
}
