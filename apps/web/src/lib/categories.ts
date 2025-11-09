const VALID_CATEGORIES = [
  'MUSIC',
  'COMEDY',
  'THEATRE',
  'FITNESS',
  'DANCE',
  'ARTS',
  'FOOD',
  'NETWORKING',
  'FAMILY',
  'OTHER',
] as const;

export type EventCategoryValue = (typeof VALID_CATEGORIES)[number];

const CATEGORY_ALIASES: Record<string, EventCategoryValue> = {
  // Food & Dining
  FOOD_DRINK: 'FOOD',
  FOODDRINK: 'FOOD',
  CULINARY: 'FOOD',
  DINING: 'FOOD',
  RESTAURANT: 'FOOD',
  WINE: 'FOOD',
  BEER: 'FOOD',
  COCKTAIL: 'FOOD',
  TASTING: 'FOOD',
  COOKING: 'FOOD',
  FOODIE: 'FOOD',
  GASTRONOMY: 'FOOD',
  BEVERAGE: 'FOOD',
  BREWERY: 'FOOD',
  WINERY: 'FOOD',

  // Music & Entertainment
  NIGHTLIFE: 'MUSIC',
  CONCERT: 'MUSIC',
  LIVE_MUSIC: 'MUSIC',
  LIVEMUSIC: 'MUSIC',
  DJ: 'MUSIC',
  BAND: 'MUSIC',
  KARAOKE: 'MUSIC',
  JAZZ: 'MUSIC',
  ROCK: 'MUSIC',
  POP: 'MUSIC',
  CLASSICAL: 'MUSIC',
  HIP_HOP: 'MUSIC',
  HIPHOP: 'MUSIC',
  ELECTRONIC: 'MUSIC',
  CLUB: 'MUSIC',
  BAR: 'MUSIC',

  // Fitness & Sports
  SPORTS: 'FITNESS',
  WELLNESS: 'FITNESS',
  WELLBEING: 'FITNESS',
  HEALTH: 'FITNESS',
  YOGA: 'FITNESS',
  WORKOUT: 'FITNESS',
  GYM: 'FITNESS',
  EXERCISE: 'FITNESS',
  RUNNING: 'FITNESS',
  CYCLING: 'FITNESS',
  HIKING: 'FITNESS',
  OUTDOOR: 'FITNESS',
  ADVENTURE: 'FITNESS',
  MEDITATION: 'FITNESS',
  PILATES: 'FITNESS',
  CROSSFIT: 'FITNESS',
  BOXING: 'FITNESS',
  MARTIAL_ARTS: 'FITNESS',
  MARTIALARTS: 'FITNESS',

  // Dance
  DANCING: 'DANCE',
  BALLROOM: 'DANCE',
  BALLET: 'DANCE',
  SALSA: 'DANCE',
  TANGO: 'DANCE',
  SWING: 'DANCE',
  ZUMBA: 'DANCE',
  HIP_HOP_DANCE: 'DANCE',

  // Arts & Culture
  ART: 'ARTS',
  VISUAL_ARTS: 'ARTS',
  VISUALARTS: 'ARTS',
  GALLERY: 'ARTS',
  MUSEUM: 'ARTS',
  EXHIBITION: 'ARTS',
  CRAFT: 'ARTS',
  PAINTING: 'ARTS',
  SCULPTURE: 'ARTS',
  PHOTOGRAPHY: 'ARTS',
  CULTURE: 'ARTS',
  CULTURAL: 'ARTS',

  // Theatre & Performance
  THEATER: 'THEATRE',
  PLAY: 'THEATRE',
  DRAMA: 'THEATRE',
  MUSICAL: 'THEATRE',
  BROADWAY: 'THEATRE',
  PERFORMANCE: 'THEATRE',
  SHOW: 'THEATRE',
  STANDUP: 'COMEDY',
  STAND_UP: 'COMEDY',
  IMPROV: 'COMEDY',
  IMPROVISATION: 'COMEDY',

  // Networking & Business
  EDUCATION: 'NETWORKING',
  BUSINESS: 'NETWORKING',
  PROFESSIONAL: 'NETWORKING',
  CONFERENCE: 'NETWORKING',
  MEETUP: 'NETWORKING',
  WORKSHOP: 'NETWORKING',
  SEMINAR: 'NETWORKING',
  TECH: 'NETWORKING',
  STARTUP: 'NETWORKING',
  ENTREPRENEUR: 'NETWORKING',

  // Family
  KIDS: 'FAMILY',
  CHILDREN: 'FAMILY',
  FAMILY_FRIENDLY: 'FAMILY',
  FAMILYFRIENDLY: 'FAMILY',
  PARENTING: 'FAMILY',
};

export function normalizeCategory(value?: string | null): EventCategoryValue | null {
  if (!value) return null;
  const upper = value.toUpperCase();

  if ((VALID_CATEGORIES as readonly string[]).includes(upper)) {
    return upper as EventCategoryValue;
  }

  return CATEGORY_ALIASES[upper] ?? null;
}

export function filterValidCategories(values?: Array<string | null | undefined>): EventCategoryValue[] {
  if (!values || values.length === 0) return [];

  const deduped = new Set<EventCategoryValue>();
  for (const value of values) {
    const normalized = normalizeCategory(value);
    if (normalized) {
      deduped.add(normalized);
    }
  }

  return Array.from(deduped);
}

export const CATEGORY_HIERARCHY: Record<EventCategoryValue, EventCategoryValue[]> = {
  MUSIC: ['MUSIC', 'THEATRE', 'DANCE', 'ARTS'],
  COMEDY: ['COMEDY', 'THEATRE', 'MUSIC', 'ARTS'],
  THEATRE: ['THEATRE', 'ARTS', 'MUSIC', 'DANCE'],
  FITNESS: ['FITNESS', 'DANCE', 'OTHER', 'MUSIC'],
  DANCE: ['DANCE', 'MUSIC', 'FITNESS', 'ARTS'],
  ARTS: ['ARTS', 'THEATRE', 'MUSIC', 'FAMILY'],
  FOOD: ['FOOD', 'FAMILY', 'NETWORKING', 'OTHER'],
  NETWORKING: ['NETWORKING', 'FOOD', 'OTHER', 'ARTS'],
  FAMILY: ['FAMILY', 'ARTS', 'FOOD', 'OTHER'],
  OTHER: ['OTHER', 'ARTS', 'MUSIC', 'FOOD'],
};

export const DEFAULT_RECOMMENDATION_CATEGORIES: EventCategoryValue[] = [
  'MUSIC',
  'FOOD',
  'NETWORKING',
];

/**
 * Category keywords for intelligent classification
 * Higher weight = higher priority for that category
 */
const CATEGORY_KEYWORDS: Record<EventCategoryValue, Array<{ keyword: string; weight: number }>> = {
  MUSIC: [
    { keyword: 'concert', weight: 10 },
    { keyword: 'music', weight: 10 },
    { keyword: 'band', weight: 9 },
    { keyword: 'jazz', weight: 9 },
    { keyword: 'rock', weight: 9 },
    { keyword: 'pop', weight: 9 },
    { keyword: 'classical', weight: 9 },
    { keyword: 'hip hop', weight: 9 },
    { keyword: 'electronic', weight: 9 },
    { keyword: 'dj', weight: 8 },
    { keyword: 'live music', weight: 10 },
    { keyword: 'nightlife', weight: 7 },
    { keyword: 'club', weight: 6 },
    { keyword: 'bar', weight: 4 },
  ],
  COMEDY: [
    { keyword: 'comedy', weight: 10 },
    { keyword: 'stand up', weight: 10 },
    { keyword: 'standup', weight: 10 },
    { keyword: 'comedian', weight: 10 },
    { keyword: 'improv', weight: 9 },
    { keyword: 'funny', weight: 6 },
    { keyword: 'laugh', weight: 5 },
  ],
  THEATRE: [
    { keyword: 'theatre', weight: 10 },
    { keyword: 'theater', weight: 10 },
    { keyword: 'play', weight: 9 },
    { keyword: 'drama', weight: 9 },
    { keyword: 'musical', weight: 10 },
    { keyword: 'broadway', weight: 10 },
    { keyword: 'performance', weight: 7 },
    { keyword: 'show', weight: 6 },
    { keyword: 'opera', weight: 9 },
  ],
  FITNESS: [
    { keyword: 'fitness', weight: 10 },
    { keyword: 'workout', weight: 10 },
    { keyword: 'gym', weight: 10 },
    { keyword: 'yoga', weight: 10 },
    { keyword: 'pilates', weight: 10 },
    { keyword: 'crossfit', weight: 10 },
    { keyword: 'running', weight: 9 },
    { keyword: 'cycling', weight: 9 },
    { keyword: 'hiking', weight: 9 },
    { keyword: 'sports', weight: 8 },
    { keyword: 'wellness', weight: 8 },
    { keyword: 'health', weight: 7 },
    { keyword: 'meditation', weight: 9 },
    { keyword: 'boxing', weight: 9 },
    { keyword: 'martial arts', weight: 9 },
    { keyword: 'exercise', weight: 9 },
    { keyword: 'outdoor', weight: 6 },
    { keyword: 'adventure', weight: 6 },
  ],
  DANCE: [
    { keyword: 'dance', weight: 10 },
    { keyword: 'dancing', weight: 10 },
    { keyword: 'ballroom', weight: 10 },
    { keyword: 'ballet', weight: 10 },
    { keyword: 'salsa', weight: 10 },
    { keyword: 'tango', weight: 10 },
    { keyword: 'swing', weight: 9 },
    { keyword: 'zumba', weight: 10 },
    { keyword: 'barre', weight: 9 },
  ],
  ARTS: [
    { keyword: 'art', weight: 10 },
    { keyword: 'gallery', weight: 10 },
    { keyword: 'museum', weight: 10 },
    { keyword: 'exhibition', weight: 10 },
    { keyword: 'visual arts', weight: 10 },
    { keyword: 'painting', weight: 9 },
    { keyword: 'sculpture', weight: 9 },
    { keyword: 'photography', weight: 9 },
    { keyword: 'craft', weight: 8 },
    { keyword: 'culture', weight: 7 },
    { keyword: 'cultural', weight: 7 },
  ],
  FOOD: [
    { keyword: 'food', weight: 10 },
    { keyword: 'dining', weight: 10 },
    { keyword: 'restaurant', weight: 10 },
    { keyword: 'wine', weight: 9 },
    { keyword: 'beer', weight: 8 },
    { keyword: 'cocktail', weight: 8 },
    { keyword: 'tasting', weight: 10 },
    { keyword: 'culinary', weight: 10 },
    { keyword: 'cooking', weight: 9 },
    { keyword: 'foodie', weight: 9 },
    { keyword: 'gastronomy', weight: 9 },
    { keyword: 'brewery', weight: 9 },
    { keyword: 'winery', weight: 9 },
    { keyword: 'brunch', weight: 8 },
    { keyword: 'dinner', weight: 8 },
  ],
  NETWORKING: [
    { keyword: 'networking', weight: 10 },
    { keyword: 'meetup', weight: 9 },
    { keyword: 'conference', weight: 10 },
    { keyword: 'workshop', weight: 9 },
    { keyword: 'seminar', weight: 9 },
    { keyword: 'business', weight: 8 },
    { keyword: 'professional', weight: 8 },
    { keyword: 'tech', weight: 7 },
    { keyword: 'startup', weight: 8 },
    { keyword: 'entrepreneur', weight: 8 },
    { keyword: 'education', weight: 7 },
  ],
  FAMILY: [
    { keyword: 'family', weight: 10 },
    { keyword: 'kids', weight: 10 },
    { keyword: 'children', weight: 10 },
    { keyword: 'family-friendly', weight: 10 },
    { keyword: 'parenting', weight: 9 },
  ],
  OTHER: [],
};

/**
 * Intelligently categorize based on title, description, and tags
 * Uses weighted keyword scoring for better accuracy
 */
export function categorizeFromText(
  title: string,
  description?: string | null,
  tags?: string[] | null
): EventCategoryValue {
  const text = [title, description, ...(tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const scores: Partial<Record<EventCategoryValue, number>> = {};

  // Score each category based on keyword matches
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const { keyword, weight } of keywords) {
      // Count occurrences of keyword in text
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex);
      if (matches) {
        score += weight * matches.length;
      }
    }
    if (score > 0) {
      scores[category as EventCategoryValue] = score;
    }
  }

  // Return category with highest score
  let bestCategory: EventCategoryValue = 'OTHER';
  let bestScore = 0;

  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category as EventCategoryValue;
    }
  }

  return bestCategory;
}

export { VALID_CATEGORIES };
