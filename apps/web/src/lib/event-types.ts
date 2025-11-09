export type EventSourceTag = 'database' | 'external_api' | 'web_search' | 'cache' | string;

export interface CityPassEvent {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category?: string | null;
  venueName?: string | null;
  neighborhood?: string | null;
  city: string;
  startTime: string;
  endTime?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  imageUrl?: string | null;
  bookingUrl?: string | null;
  lat?: number | null;
  lon?: number | null;
  tags?: string[] | null;
  score?: number;
  source?: EventSourceTag;
}
