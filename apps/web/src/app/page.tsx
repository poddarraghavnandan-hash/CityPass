'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface Event {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  venue_name?: string;
  neighborhood?: string;
  start_time: number;
  price_min?: number;
  price_max?: number;
  image_url?: string;
  booking_url?: string;
}

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');

  useEffect(() => {
    fetchEvents();
  }, [category, priceMax]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        city: 'New York',
        ...(category && { category }),
        ...(priceMax && { price_max: priceMax }),
      });

      const response = await fetch(`/api/events?${params}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const params = new URLSearchParams({
        city: 'New York',
        ...(searchQuery && { q: searchQuery }),
        ...(category && { category }),
        ...(priceMax && { price_max: priceMax }),
      });

      const response = await fetch(`/api/events?${params}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (event: Event) => {
    if (event.price_min === 0 && !event.price_max) return 'Free';
    if (event.price_min && event.price_max) {
      return `$${event.price_min} - $${event.price_max}`;
    }
    if (event.price_min) return `From $${event.price_min}`;
    return 'Price varies';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-4xl font-bold tracking-tight">CityPass</h1>
          <p className="text-muted-foreground mt-2">
            Discover events happening in New York
          </p>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="border-b bg-muted/50">
        <div className="container mx-auto px-4 py-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit">Search</Button>
            </div>

            <div className="flex gap-4">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="MUSIC">Music</SelectItem>
                  <SelectItem value="COMEDY">Comedy</SelectItem>
                  <SelectItem value="THEATRE">Theatre</SelectItem>
                  <SelectItem value="DANCE">Dance</SelectItem>
                  <SelectItem value="ARTS">Arts</SelectItem>
                  <SelectItem value="FOOD">Food & Drink</SelectItem>
                  <SelectItem value="NETWORKING">Networking</SelectItem>
                  <SelectItem value="FAMILY">Family</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priceMax} onValueChange={setPriceMax}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Max Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Free</SelectItem>
                  <SelectItem value="20">Under $20</SelectItem>
                  <SelectItem value="50">Under $50</SelectItem>
                  <SelectItem value="100">Under $100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>
      </div>

      {/* Events Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No events found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-muted-foreground">
                Found {events.length} events
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {event.image_url && (
                    <div className="aspect-video relative overflow-hidden bg-muted">
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">
                          {event.title}
                        </CardTitle>
                        {event.subtitle && (
                          <CardDescription className="mt-1">
                            {event.subtitle}
                          </CardDescription>
                        )}
                      </div>
                      {event.category && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                          {event.category}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {event.venue_name && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">
                          {event.venue_name}
                          {event.neighborhood && ` • ${event.neighborhood}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(event.start_time * 1000), 'EEE, MMM d, h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatPrice(event)}</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    {event.booking_url ? (
                      <Button asChild className="w-full">
                        <a href={event.booking_url} target="_blank" rel="noopener noreferrer">
                          Book Tickets
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
