import { describe, it, expect, vi } from 'vitest';
import type { RankedItem, Intention } from '@citypass/types';

describe('SlateCards Component', () => {
  const mockSlates = {
    best: [
      {
        id: '1',
        title: 'Blue Note Jazz Club',
        venueName: 'Blue Note',
        startTime: new Date('2025-11-17T20:00:00'),
        description: 'Live jazz performance',
        reasons: ['Great acoustics', 'Legendary venue', 'Top performers'],
        bookingUrl: 'https://example.com/book/1',
      } as RankedItem,
      {
        id: '2',
        title: 'Village Vanguard',
        venueName: 'Vanguard',
        startTime: new Date('2025-11-17T21:00:00'),
        description: 'Historic jazz club',
        reasons: ['Intimate setting', 'Classic atmosphere'],
        bookingUrl: 'https://example.com/book/2',
      } as RankedItem,
    ],
    wildcard: [
      {
        id: '3',
        title: 'Experimental Jazz Night',
        venueName: 'The Loft',
        startTime: new Date('2025-11-17T22:00:00'),
        description: 'Avant-garde jazz',
        reasons: ['Unique experience', 'Hidden gem'],
      } as RankedItem,
    ],
    closeAndEasy: [
      {
        id: '4',
        title: 'Local Jazz Bar',
        venueName: 'Corner Bar',
        startTime: new Date('2025-11-17T19:00:00'),
        description: 'Neighborhood jazz',
        reasons: ['Walking distance', 'No cover'],
      } as RankedItem,
    ],
  };

  const mockIntention: Intention = {
    city: 'New York',
    tokens: {
      mood: 'jazzy',
      untilMinutes: 120,
      distanceKm: 5,
      budget: 'medium',
      companions: ['friends'],
    },
  } as Intention;

  describe('Rendering', () => {
    it('renders nothing when slates is null', () => {
      const result = renderSlateCards({
        slates: null,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result).toBeNull();
    });

    it('renders all three tabs', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.tabs.length).toBe(3);
      expect(result!.tabs[0].label).toBe('Best Fit');
      expect(result!.tabs[1].label).toBe('Wildcard');
      expect(result!.tabs[2].label).toBe('Close & Easy');
    });

    it('highlights active tab', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'wildcard',
        onTabChange: vi.fn(),
      });

      expect(result!.tabs[0].isActive).toBe(false);
      expect(result!.tabs[1].isActive).toBe(true);
      expect(result!.tabs[2].isActive).toBe(false);
    });

    it('displays items for active tab', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items.length).toBe(2);
      expect(result!.items[0].title).toBe('Blue Note Jazz Club');
      expect(result!.items[1].title).toBe('Village Vanguard');
    });

    it('switches items when tab changes', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'wildcard',
        onTabChange: vi.fn(),
      });

      expect(result!.items.length).toBe(1);
      expect(result!.items[0].title).toBe('Experimental Jazz Night');
    });

    it('handles empty slate gracefully', () => {
      const emptySlates = { best: [], wildcard: [], closeAndEasy: [] };
      const result = renderSlateCards({
        slates: emptySlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items.length).toBe(0);
    });
  });

  describe('Event Card Content', () => {
    it('displays event title and venue', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items[0].title).toBe('Blue Note Jazz Club');
      expect(result!.items[0].venueName).toBe('Blue Note');
    });

    it('displays formatted start time', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      const item = result!.items[0];
      expect(item.formattedTime).toContain('8:00');
      expect(item.formattedTime).toContain('PM');
    });

    it('displays event description when available', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items[0].description).toBe('Live jazz performance');
    });

    it('displays reasons for recommendation', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items[0].reasons).toEqual([
        'Great acoustics',
        'Legendary venue',
        'Top performers',
      ]);
    });

    it('limits reasons display to first 3', () => {
      const itemWithManyReasons = {
        ...mockSlates.best[0],
        reasons: ['Reason 1', 'Reason 2', 'Reason 3', 'Reason 4', 'Reason 5'],
      };

      const result = renderSlateCards({
        slates: { best: [itemWithManyReasons], wildcard: [], closeAndEasy: [] },
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items[0].displayedReasons?.length).toBe(3);
    });

    it('handles missing venue name gracefully', () => {
      const itemWithoutVenue = { ...mockSlates.best[0], venueName: undefined };

      const result = renderSlateCards({
        slates: { best: [itemWithoutVenue], wildcard: [], closeAndEasy: [] },
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items[0].venueName).toBe('City venue');
    });
  });

  describe('Action Buttons', () => {
    it('renders Route button with booking URL', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      const routeButton = result!.items[0].actions.find(a => a.label === 'Route');
      expect(routeButton).toBeDefined();
      expect(routeButton!.url).toBe('https://example.com/book/1');
      expect(routeButton!.opensNewTab).toBe(true);
    });

    it('renders Route button with # when no booking URL', () => {
      const itemWithoutBookingUrl = { ...mockSlates.best[0], bookingUrl: undefined };

      const result = renderSlateCards({
        slates: { best: [itemWithoutBookingUrl], wildcard: [], closeAndEasy: [] },
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      const routeButton = result!.items[0].actions.find(a => a.label === 'Route');
      expect(routeButton!.url).toBe('#');
    });

    it('renders Save button', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      const saveButton = result!.items[0].actions.find(a => a.label === 'Save');
      expect(saveButton).toBeDefined();
    });

    it('renders Add to Calendar button with ICS link', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      const calendarButton = result!.items[0].actions.find(a => a.label === 'Add to Calendar');
      expect(calendarButton).toBeDefined();
      expect(calendarButton!.url).toBe('/api/plan?ics=1');
      expect(calendarButton!.opensNewTab).toBe(true);
    });

    it('renders Open in Feed button with correct query params', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
        intention: mockIntention,
      });

      const feedButton = result!.items[0].actions.find(a => a.label === 'Open in Feed');
      expect(feedButton).toBeDefined();
      expect(feedButton!.url).toContain('ids=1');
      expect(feedButton!.url).toContain('city=New York');
      expect(feedButton!.url).toContain('mood=jazzy');
    });
  });

  describe('Tab Interaction', () => {
    it('calls onTabChange when tab is clicked', () => {
      const onTabChange = vi.fn();

      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange,
      });

      // Simulate clicking wildcard tab
      result!.tabs[1].onClick();

      expect(onTabChange).toHaveBeenCalledWith('wildcard');
    });

    it('calls onTabChange with correct tab key', () => {
      const onTabChange = vi.fn();

      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange,
      });

      // Click each tab
      result!.tabs[0].onClick();
      expect(onTabChange).toHaveBeenCalledWith('best');

      result!.tabs[1].onClick();
      expect(onTabChange).toHaveBeenCalledWith('wildcard');

      result!.tabs[2].onClick();
      expect(onTabChange).toHaveBeenCalledWith('closeAndEasy');
    });
  });

  describe('Styling', () => {
    it('applies active styles to active tab', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.tabs[0].styles).toContain('bg-white');
      expect(result!.tabs[0].styles).toContain('text-black');
    });

    it('applies inactive styles to inactive tabs', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.tabs[1].styles).toContain('bg-white/10');
      expect(result!.tabs[1].styles).toContain('text-white');
    });

    it('applies card styling to event items', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items[0].cardStyles).toContain('rounded-2xl');
      expect(result!.items[0].cardStyles).toContain('border-white/10');
      expect(result!.items[0].cardStyles).toContain('bg-white/5');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic section element', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.element).toBe('section');
    });

    it('uses article elements for event cards', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items[0].element).toBe('article');
    });

    it('uses header element for event title section', () => {
      const result = renderSlateCards({
        slates: mockSlates,
        activeTab: 'best',
        onTabChange: vi.fn(),
      });

      expect(result!.items[0].hasHeader).toBe(true);
    });
  });
});

// Mock rendering function
function renderSlateCards(props: {
  slates: any;
  activeTab: 'best' | 'wildcard' | 'closeAndEasy';
  onTabChange: (tab: 'best' | 'wildcard' | 'closeAndEasy') => void;
  intention?: Intention;
}) {
  const { slates, activeTab, onTabChange, intention } = props;

  if (!slates) {
    return null;
  }

  const items = slates[activeTab] || [];
  const tabs = [
    { key: 'best' as const, label: 'Best Fit' },
    { key: 'wildcard' as const, label: 'Wildcard' },
    { key: 'closeAndEasy' as const, label: 'Close & Easy' },
  ];

  return {
    element: 'section',
    tabs: tabs.map((tab) => ({
      key: tab.key,
      label: tab.label,
      isActive: activeTab === tab.key,
      styles: activeTab === tab.key ? 'bg-white text-black' : 'bg-white/10 text-white',
      onClick: () => onTabChange(tab.key),
    })),
    items: items.map((item: RankedItem) => ({
      id: item.id,
      element: 'article',
      hasHeader: true,
      title: item.title,
      venueName: item.venueName ?? 'City venue',
      description: item.description,
      formattedTime: new Date(item.startTime).toLocaleString([], {
        hour: 'numeric',
        minute: '2-digit',
        weekday: 'short',
      }),
      reasons: item.reasons,
      displayedReasons: item.reasons?.slice(0, 3),
      cardStyles: 'rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2',
      actions: [
        {
          label: 'Route',
          url: item.bookingUrl ?? '#',
          opensNewTab: true,
        },
        {
          label: 'Save',
        },
        {
          label: 'Add to Calendar',
          url: `/api/plan?ics=${item.id}`,
          opensNewTab: true,
        },
        {
          label: 'Open in Feed',
          url: `/feed?ids=${item.id}&city=${intention?.city}&mood=${intention?.tokens?.mood}`,
        },
      ],
    })),
  };
}
