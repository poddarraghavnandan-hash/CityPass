/**
 * Chat Brain V2 - Context Assembler
 * Builds rich context snapshots from user requests, profile, learner state, and candidate events
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@citypass/db';
import type {
  ChatContextSnapshot,
  BuildContextInput,
  Profile,
  LearnerState,
  CandidateEvent,
} from './types';
import { extractIntentTokens, mapToIntentionTokens } from '@citypass/utils';

/**
 * Build a complete ChatContextSnapshot from user input
 */
export async function buildChatContextSnapshot(
  input: BuildContextInput
): Promise<ChatContextSnapshot> {
  const { userId, anonId, freeText, cityHint, threadId } = input;

  // Generate unique identifiers
  const traceId = uuidv4();
  const sessionId = threadId || uuidv4();
  const nowISO = new Date().toISOString();

  // 1. Load profile if userId exists
  const profile = await loadUserProfile(userId);

  // 2. Determine city
  const city = cityHint || profile.moodsPreferred[0] || process.env.NEXT_PUBLIC_DEFAULT_CITY || 'New York';

  // 3. Load learner state
  const learnerState = await loadLearnerState(userId);

  // 4. Build chat history summary
  const chatHistorySummary = await buildChatHistorySummary(threadId, userId, anonId);

  // 5. Build recent picks summary
  const recentPicksSummary = await buildRecentPicksSummary(userId, anonId);

  // 6. Determine search window from freeText
  const searchWindow = determineSearchWindow(freeText, nowISO);

  // 7. Query candidate events from repository
  const candidateEvents = await queryCandidateEvents({
    freeText,
    searchWindow,
    city,
    userId,
    profile,
  });

  // 8. Load user location from cookie if available
  const locationApprox = await loadUserLocation();

  return {
    userId,
    anonId,
    sessionId,
    freeText,
    nowISO,
    city,
    locationApprox,

    profile,
    learnerState,

    chatHistorySummary,
    recentPicksSummary,

    searchWindow,
    candidateEvents,
    traceId,
  };
}

/**
 * Load user profile from database
 */
async function loadUserProfile(userId?: string): Promise<Profile> {
  if (!userId) {
    return {
      moodsPreferred: [],
      dislikes: [],
      budgetBand: null,
      maxTravelMinutes: null,
      scheduleBias: null,
      socialStyle: null,
      tasteVectorId: null,
    };
  }

  try {
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: {
        favoriteCategories: true,
        priceMin: true,
        priceMax: true,
        timeOfDay: true,
        meta: true,
      },
    });

    if (!userProfile) {
      return {
        moodsPreferred: [],
        dislikes: [],
        budgetBand: null,
        maxTravelMinutes: null,
        scheduleBias: null,
        socialStyle: null,
        tasteVectorId: null,
      };
    }

    // Map database fields to Profile type
    const meta = userProfile.meta as any;

    // Map BudgetTier from prefs to BudgetBand
    let budgetBand = mapPriceToBudgetBand(userProfile.priceMin, userProfile.priceMax);
    if (meta?.budget) {
      budgetBand = mapBudgetTierToBudgetBand(meta.budget);
    }

    // Convert distanceKm to maxTravelMinutes (assume 50 km/h average speed)
    let maxTravelMinutes = meta?.maxTravelMinutes || null;
    if (meta?.distanceKm && !maxTravelMinutes) {
      maxTravelMinutes = Math.round((meta.distanceKm / 50) * 60); // km/h to minutes
    }

    // Map soloFriendly boolean to socialStyle
    let socialStyle = meta?.socialStyle || null;
    if (meta?.soloFriendly === true && !socialStyle) {
      socialStyle = 'solo';
    } else if (meta?.soloFriendly === false && !socialStyle) {
      socialStyle = 'social';
    }

    // Build moodsPreferred array, including mood if present
    const moodsPreferred = [...(userProfile.favoriteCategories || [])];
    if (meta?.mood && !moodsPreferred.includes(meta.mood)) {
      moodsPreferred.unshift(meta.mood);
    }

    return {
      moodsPreferred,
      dislikes: meta?.dislikes || [],
      budgetBand,
      maxTravelMinutes,
      scheduleBias: userProfile.timeOfDay || null,
      socialStyle,
      tasteVectorId: null, // Will be fetched separately if needed
    };
  } catch (error) {
    console.error('[ContextAssembler] Failed to load user profile:', error);
    return {
      moodsPreferred: [],
      dislikes: [],
      budgetBand: null,
      maxTravelMinutes: null,
      scheduleBias: null,
      socialStyle: null,
      tasteVectorId: null,
    };
  }
}

/**
 * Load learner state (exploration level, bandit policy, etc.)
 */
async function loadLearnerState(userId?: string): Promise<LearnerState> {
  if (!userId) {
    return {
      explorationLevel: 'MEDIUM',
      noveltyTarget: 0.3,
      banditPolicyName: 'default',
    };
  }

  try {
    // Check for taste vector
    const tasteVector = await prisma.tasteVector.findUnique({
      where: { userId },
      select: {
        id: true,
        metadata: true,
      },
    });

    // TODO: Load actual bandit policy from db
    const activePolicy = await prisma.slatePolicy.findFirst({
      where: { isActive: true },
      select: { name: true, params: true },
    });

    const metadata = tasteVector?.metadata as any;
    const explorationLevel = metadata?.explorationLevel || 'MEDIUM';
    const noveltyTarget = metadata?.noveltyTarget || 0.3;

    return {
      explorationLevel: explorationLevel as 'LOW' | 'MEDIUM' | 'HIGH',
      noveltyTarget,
      banditPolicyName: activePolicy?.name || 'default',
    };
  } catch (error) {
    console.error('[ContextAssembler] Failed to load learner state:', error);
    return {
      explorationLevel: 'MEDIUM',
      noveltyTarget: 0.3,
      banditPolicyName: 'default',
    };
  }
}

/**
 * Build chat history summary from recent messages
 */
async function buildChatHistorySummary(
  threadId?: string,
  userId?: string,
  anonId?: string
): Promise<string> {
  if (!threadId) {
    return 'No previous conversation history.';
  }

  try {
    const recentMessages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        role: true,
        freeText: true,
        modelReply: true,
      },
    });

    if (recentMessages.length === 0) {
      return 'Starting new conversation.';
    }

    // Build simple summary (TODO: use LLM for better summarization)
    const messageSummaries = recentMessages
      .reverse()
      .map((msg) => {
        if (msg.role === 'user') {
          return `User asked: "${msg.freeText?.slice(0, 50)}..."`;
        } else if (msg.role === 'assistant') {
          return `Assistant replied with recommendations.`;
        }
        return '';
      })
      .filter(Boolean)
      .join(' ');

    return messageSummaries || 'Continuing conversation.';
  } catch (error) {
    console.error('[ContextAssembler] Failed to build chat history:', error);
    return 'Unable to load conversation history.';
  }
}

/**
 * Build summary of recent user interactions (saves, clicks, etc.)
 */
async function buildRecentPicksSummary(userId?: string, anonId?: string): Promise<string> {
  const identifier = userId || anonId;
  if (!identifier) {
    return 'No interaction history.';
  }

  try {
    const recentLogs = await prisma.eventLog.findMany({
      where: {
        OR: [
          { userId: userId || undefined },
          { anonId: anonId || undefined },
        ],
        eventType: { in: ['SAVE', 'CLICK_ROUTE', 'HIDE'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        eventType: true,
        payload: true,
      },
    });

    if (recentLogs.length === 0) {
      return 'No recent interactions.';
    }

    const saved = recentLogs.filter((log) => log.eventType === 'SAVE').length;
    const clicked = recentLogs.filter((log) => log.eventType === 'CLICK_ROUTE').length;
    const hidden = recentLogs.filter((log) => log.eventType === 'HIDE').length;

    return `Recent activity: ${saved} saved, ${clicked} clicked, ${hidden} hidden.`;
  } catch (error) {
    console.error('[ContextAssembler] Failed to build recent picks summary:', error);
    return 'Unable to load interaction history.';
  }
}

/**
 * Determine search time window from free text
 */
function determineSearchWindow(
  freeText: string,
  nowISO: string
): { fromISO: string; toISO: string } {
  const now = new Date(nowISO);

  // Use existing intent extraction logic
  const extracted = extractIntentTokens(freeText, now);

  if (extracted.timeWindow) {
    const fromDate = new Date(now);
    fromDate.setMinutes(fromDate.getMinutes() + (extracted.timeWindow.fromMinutes || 0));

    const toDate = new Date(now);
    toDate.setMinutes(toDate.getMinutes() + extracted.timeWindow.untilMinutes);

    return {
      fromISO: fromDate.toISOString(),
      toISO: toDate.toISOString(),
    };
  }

  // Default: next 3 hours
  const fromDate = new Date(now);
  const toDate = new Date(now);
  toDate.setHours(toDate.getHours() + 3);

  return {
    fromISO: fromDate.toISOString(),
    toISO: toDate.toISOString(),
  };
}

/**
 * Query candidate events from existing search/RAG system
 */
async function queryCandidateEvents(params: {
  freeText: string;
  searchWindow: { fromISO: string; toISO: string };
  city: string;
  userId?: string;
  profile: Profile;
}): Promise<CandidateEvent[]> {
  const { freeText, searchWindow, city } = params;

  try {
    // Extract category hints from free text
    const categoryHint = extractCategoryFromText(freeText);
    const keywords = extractKeywords(freeText);

    console.log(`[ContextAssembler] Searching for events with category: ${categoryHint || 'any'}, keywords: ${keywords.join(', ') || 'none'}`);

    // Build where clause with text search
    const whereClause: any = {
      city,
      startTime: {
        gte: new Date(searchWindow.fromISO),
        lte: new Date(searchWindow.toISO),
      },
    };

    // Add category filter if we detected one
    if (categoryHint) {
      whereClause.category = categoryHint;
    }

    // Add text search with keywords (now works WITH category filter)
    if (keywords.length > 0) {
      whereClause.OR = keywords.flatMap((keyword) => [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ]);
    }

    // Query events from database with smart filters
    let events = await prisma.event.findMany({
      where: whereClause,
      take: 50,
      orderBy: {
        startTime: 'asc',
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        neighborhood: true,
        venueName: true,
        category: true,
        priceMin: true,
        priceMax: true,
        tags: true,
      },
    });

    console.log(`[ContextAssembler] Found ${events.length} candidate events`);

    // FALLBACK: If category filter returned 0 results, try again with just keywords
    if (events.length === 0 && categoryHint) {
      console.log(`[ContextAssembler] No ${categoryHint} events found, broadening search with keywords...`);

      const fallbackWhere: any = {
        city,
        startTime: {
          gte: new Date(searchWindow.fromISO),
          lte: new Date(searchWindow.toISO),
        },
      };

      // Use keyword search without category constraint
      if (keywords.length > 0) {
        fallbackWhere.OR = keywords.flatMap((keyword) => [
          { title: { contains: keyword, mode: 'insensitive' } },
          { description: { contains: keyword, mode: 'insensitive' } },
        ]);
      }

      events = await prisma.event.findMany({
        where: fallbackWhere,
        take: 50,
        orderBy: {
          startTime: 'asc',
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          neighborhood: true,
          venueName: true,
          category: true,
          priceMin: true,
          priceMax: true,
          tags: true,
        },
      });

      console.log(`[ContextAssembler] Fallback search found ${events.length} events`);
    }

    // Map to CandidateEvent format
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      startISO: event.startTime.toISOString(),
      endISO: event.endTime?.toISOString(),
      neighborhood: event.neighborhood,
      distanceMin: null, // TODO: Calculate if user location available
      priceBand: mapPriceToBand(event.priceMin, event.priceMax),
      categories: event.category ? [event.category] : [],
      moods: event.tags || [],
      venueName: event.venueName,
      socialHeatScore: null, // Will be computed by ranker
      noveltyScore: null, // Will be computed by ranker
      fitScore: null, // Will be computed by ranker
    }));
  } catch (error) {
    console.error('[ContextAssembler] Failed to query candidate events:', error);
    return [];
  }
}

/**
 * Extract category hint from free text
 */
function extractCategoryFromText(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Map keywords to EventCategory enum values
  const categoryMap: Record<string, string> = {
    'music': 'MUSIC',
    'concert': 'MUSIC',
    'show': 'MUSIC',
    'band': 'MUSIC',
    'comedy': 'COMEDY',
    'standup': 'COMEDY',
    'stand up': 'COMEDY',
    'comedian': 'COMEDY',
    'theatre': 'THEATRE',
    'theater': 'THEATRE',
    'play': 'THEATRE',
    'musical': 'THEATRE',
    'dance': 'DANCE',
    'dancing': 'DANCE',
    'ballet': 'DANCE',
    'fitness': 'FITNESS',
    'workout': 'FITNESS',
    'yoga': 'FITNESS',
    'gym': 'FITNESS',
    'art': 'ARTS',
    'arts': 'ARTS',
    'gallery': 'ARTS',
    'museum': 'ARTS',
    'exhibition': 'ARTS',
    'food': 'FOOD',
    'restaurant': 'FOOD',
    'dining': 'FOOD',
    'brunch': 'FOOD',
    'dinner': 'FOOD',
    'networking': 'NETWORKING',
    'meetup': 'NETWORKING',
    'professional': 'NETWORKING',
    'family': 'FAMILY',
    'kids': 'FAMILY',
    'children': 'FAMILY',
  };

  for (const [keyword, category] of Object.entries(categoryMap)) {
    if (lowerText.includes(keyword)) {
      return category;
    }
  }

  return null;
}

/**
 * Extract search keywords from free text
 */
function extractKeywords(text: string): string[] {
  // Remove common stopwords and extract meaningful keywords
  const stopwords = ['i', 'want', 'to', 'go', 'for', 'a', 'the', 'tonight', 'today', 'now', 'something', 'find', 'show', 'me'];
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopwords.includes(word));

  return [...new Set(words)]; // Remove duplicates
}

/**
 * Helper: Map price range to budget band
 */
function mapPriceToBudgetBand(
  priceMin?: number | null,
  priceMax?: number | null
): 'LOW' | 'MID' | 'HIGH' | 'LUXE' | null {
  if (priceMin == null && priceMax == null) return null;

  const avgPrice = ((priceMin || 0) + (priceMax || 0)) / 2;

  if (avgPrice === 0) return 'LOW';
  if (avgPrice < 30) return 'LOW';
  if (avgPrice < 75) return 'MID';
  if (avgPrice < 150) return 'HIGH';
  return 'LUXE';
}

/**
 * Helper: Map price to price band enum
 */
function mapPriceToBand(
  priceMin?: number | null,
  priceMax?: number | null
): 'FREE' | 'LOW' | 'MID' | 'HIGH' | 'LUXE' | null {
  if (priceMin == null && priceMax == null) return null;
  if (priceMin === 0 && priceMax === 0) return 'FREE';

  const avgPrice = ((priceMin || 0) + (priceMax || 0)) / 2;

  if (avgPrice < 20) return 'LOW';
  if (avgPrice < 60) return 'MID';
  if (avgPrice < 120) return 'HIGH';
  return 'LUXE';
}

/**
 * Helper: Map BudgetTier (from frontend prefs) to BudgetBand (backend enum)
 */
function mapBudgetTierToBudgetBand(
  budgetTier: string
): 'LOW' | 'MID' | 'HIGH' | 'LUXE' | null {
  switch (budgetTier) {
    case 'free':
      return 'LOW';
    case 'casual':
      return 'MID';
    case 'splurge':
      return 'HIGH';
    default:
      return null;
  }
}

/**
 * Helper: Load user location from cookie
 */
async function loadUserLocation(): Promise<{ lat: number; lon: number } | null> {
  // This function is called from a Next.js context (API route)
  // Since next/headers causes build issues when imported dynamically,
  // we return null for now. Location should be passed via BuildContextInput if needed.
  return null;
}
