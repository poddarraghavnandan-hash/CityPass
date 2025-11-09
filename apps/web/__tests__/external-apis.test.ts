import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchExternalAPIs } from '../src/lib/external-apis';
import { searchEventbrite } from '../src/lib/external-apis/eventbrite';
import { searchViator } from '../src/lib/external-apis/viator';
import { searchClassPass } from '../src/lib/external-apis/classpass';

vi.mock('../src/lib/external-apis/eventbrite', () => ({
  searchEventbrite: vi.fn(),
}));
vi.mock('../src/lib/external-apis/viator', () => ({
  searchViator: vi.fn(),
}));
vi.mock('../src/lib/external-apis/classpass', () => ({
  searchClassPass: vi.fn(),
}));

const eventbriteMock = vi.mocked(searchEventbrite);
const viatorMock = vi.mocked(searchViator);
const classPassMock = vi.mocked(searchClassPass);

describe('searchExternalAPIs', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('merges provider data and deduplicates by sourceUrl', async () => {
    eventbriteMock.mockResolvedValue([
      buildExternalEvent({ sourceUrl: 'https://example.com/a', title: 'Event A' }),
    ]);
    viatorMock.mockResolvedValue([
      buildExternalEvent({ sourceUrl: 'https://example.com/a', title: 'Duplicate Event' }),
      buildExternalEvent({ sourceUrl: 'https://example.com/b', title: 'Event B' }),
    ]);
    classPassMock.mockResolvedValue([]);

    const results = await searchExternalAPIs({ query: 'music', city: 'New York', limit: 5 });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('https://example.com/a');
    expect(results[1].id).toBe('https://example.com/b');
  });

  it('handles provider failures gracefully', async () => {
    eventbriteMock.mockRejectedValue(new Error('rate limited'));
    viatorMock.mockResolvedValue([
      buildExternalEvent({ sourceUrl: 'https://example.com/c', title: 'Only Event' }),
    ]);
    classPassMock.mockResolvedValue([]);

    const results = await searchExternalAPIs({ query: 'comedy', city: 'Chicago', limit: 10 });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Only Event');
  });

  it('normalizes categories and enforces limit', async () => {
    const sample = Array.from({ length: 4 }, (_, idx) => {
      const cat = idx % 2 === 0 ? 'FOOD' : 'FITNESS';
      return buildExternalEvent({
        sourceUrl: `https://example.com/${idx}`,
        category: cat,
      });
    });

    eventbriteMock.mockResolvedValue(sample);
    viatorMock.mockResolvedValue([]);
    classPassMock.mockResolvedValue([]);

    const results = await searchExternalAPIs({ query: 'food', city: 'Boston', limit: 2 });

    expect(results).toHaveLength(2);
    results.forEach((result) => {
      expect(['FOOD', 'FITNESS']).toContain(result.category);
    });
  });
});

type EventCategoryValue = 'MUSIC' | 'COMEDY' | 'THEATRE' | 'FITNESS' | 'DANCE' | 'ARTS' | 'FOOD' | 'NETWORKING' | 'FAMILY' | 'OTHER';

interface TestExternalEvent {
  sourceUrl: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  venueName: string;
  address: string;
  city: string;
  lat: number;
  lon: number;
  priceMin: number;
  priceMax: number;
  currency: string;
  category: EventCategoryValue;
  imageUrl: null;
  bookingUrl: string;
  timezone: string;
  organizer: string;
}

function buildExternalEvent(overrides: Partial<TestExternalEvent> = {}): TestExternalEvent {
  return {
    ...baseEvent(),
    ...overrides,
  };
}

function baseEvent(): TestExternalEvent {
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  return {
    sourceUrl: 'https://example.com/base',
    title: 'Sample Event',
    description: 'Test description',
    startTime: now,
    endTime: later,
    venueName: 'Sample Venue',
    address: '123 Test St, New York, NY',
    city: 'New York',
    lat: 40.0,
    lon: -73.0,
    priceMin: 10,
    priceMax: 20,
    currency: 'USD',
    category: 'MUSIC',
    imageUrl: null,
    bookingUrl: 'https://tickets.example.com',
    timezone: 'America/New_York',
    organizer: 'Tester',
  };
}
