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
import { getPopularEventsForColdStart, isUserInColdStart } from './coldStartStrategy';

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
  let candidateEvents = await queryCandidateEvents({
    freeText,
    searchWindow,
    city,
    userId,
    profile,
  });

  // 7a. Cold Start Enhancement: If user is new and has few results, augment with popular events
  if (isUserInColdStart(profile) && candidateEvents.length < 20) {
    console.log('[ContextAssembler] Cold start detected, augmenting with popular events...');

    const popularEvents = await getPopularEventsForColdStart({
      city,
      timeWindow: searchWindow,
      maxEvents: 30,
      diversityBoost: true,
    });

    // Merge, keeping user-matched events first, then popular events
    const mergedEvents = [...candidateEvents];
    const existingIds = new Set(candidateEvents.map((e) => e.id));

    for (const popEvent of popularEvents) {
      if (!existingIds.has(popEvent.id) && mergedEvents.length < 50) {
        mergedEvents.push(popEvent);
      }
    }

    console.log(`[ContextAssembler] Enhanced from ${candidateEvents.length} to ${mergedEvents.length} events for cold start user`);
    candidateEvents = mergedEvents;
  }

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

    // Validate that time window is in the future
    if (toDate.getTime() < now.getTime()) {
      console.warn('[ContextAssembler] Extracted time window is in the past, using default window instead', {
        freeText,
        extractedFrom: fromDate.toISOString(),
        extractedTo: toDate.toISOString(),
        now: now.toISOString()
      });

      // Fall through to default window
    } else {
      console.log('[ContextAssembler] Using extracted time window', {
        freeText,
        fromISO: fromDate.toISOString(),
        toISO: toDate.toISOString(),
        durationHours: ((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60)).toFixed(1)
      });

      return {
        fromISO: fromDate.toISOString(),
        toISO: toDate.toISOString(),
      };
    }
  }

  // Default: next 24 hours for better relevance (reduced from 48h)
  const fromDate = new Date(now);
  const toDate = new Date(now);
  toDate.setHours(toDate.getHours() + 24);

  console.log('[ContextAssembler] Using default 24h time window', {
    fromISO: fromDate.toISOString(),
    toISO: toDate.toISOString()
  });

  return {
    fromISO: fromDate.toISOString(),
    toISO: toDate.toISOString(),
  };
}

/**
 * PHASE 1 (WEEK 1-2): Multi-strategy Retrieval
 * Get trending events based on recent engagement
 */
async function getTrendingEvents(params: {
  city: string;
  searchWindow: { fromISO: string; toISO: string };
  limit: number;
}): Promise<any[]> {
  const { city, searchWindow, limit } = params;

  try {
    // Get events with high recent engagement
    const events = await prisma.event.findMany({
      where: {
        city,
        startTime: {
          gte: new Date(searchWindow.fromISO),
          lte: new Date(searchWindow.toISO),
        },
      },
      take: limit,
      orderBy: [
        { saveCount24h: 'desc' },
        { viewCount24h: 'desc' },
      ],
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

    console.log(`[ContextAssembler:Trending] Found ${events.length} trending events`);
    return events;
  } catch (error) {
    console.error('[ContextAssembler:Trending] Failed:', error);
    return [];
  }
}

/**
 * Get popular events by category
 */
async function getPopularByCategory(params: {
  city: string;
  searchWindow: { fromISO: string; toISO: string };
  categoryHint: string | null;
  limit: number;
}): Promise<any[]> {
  const { city, searchWindow, categoryHint, limit } = params;

  try {
    const whereClause: any = {
      city,
      startTime: {
        gte: new Date(searchWindow.fromISO),
        lte: new Date(searchWindow.toISO),
      },
    };

    // If category hint, prioritize that category
    if (categoryHint) {
      whereClause.category = categoryHint;
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      take: limit,
      orderBy: [
        { saveCount24h: 'desc' },
        { startTime: 'asc' },
      ],
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

    console.log(`[ContextAssembler:Popular] Found ${events.length} popular events in category ${categoryHint || 'any'}`);
    return events;
  } catch (error) {
    console.error('[ContextAssembler:Popular] Failed:', error);
    return [];
  }
}

/**
 * Get events liked by users with similar preferences (collaborative filtering)
 */
async function getCollaborativeEvents(params: {
  userId?: string;
  city: string;
  searchWindow: { fromISO: string; toISO: string };
  limit: number;
}): Promise<any[]> {
  const { userId, city, searchWindow, limit } = params;

  if (!userId) {
    return [];
  }

  try {
    // Simplified collaborative filtering without complex JSON queries
    // For now, return empty array - this can be enhanced with proper JSON filtering later
    // or by adding a proper event-user interaction table
    console.log(`[ContextAssembler:Collaborative] Skipping collaborative filtering (requires JSON query optimization)`);
    return [];
  } catch (error) {
    console.error('[ContextAssembler:Collaborative] Failed:', error);
    return [];
  }
}

/**
 * Get events near user location
 */
async function getLocationBasedEvents(params: {
  city: string;
  searchWindow: { fromISO: string; toISO: string };
  profile: Profile;
  limit: number;
}): Promise<any[]> {
  const { city, searchWindow, profile, limit } = params;

  // TODO: Implement location-based search when user location is available
  // For now, prioritize events in preferred neighborhoods

  try {
    const events = await prisma.event.findMany({
      where: {
        city,
        startTime: {
          gte: new Date(searchWindow.fromISO),
          lte: new Date(searchWindow.toISO),
        },
      },
      take: limit,
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

    console.log(`[ContextAssembler:Location] Found ${events.length} location-based events`);
    return events;
  } catch (error) {
    console.error('[ContextAssembler:Location] Failed:', error);
    return [];
  }
}

/**
 * Merge and deduplicate events from multiple strategies
 */
function deduplicateAndMerge(eventLists: any[][]): any[] {
  const seen = new Set<string>();
  const merged: any[] = [];

  // Flatten all event lists
  const allEvents = eventLists.flat();

  for (const event of allEvents) {
    if (!seen.has(event.id)) {
      seen.add(event.id);
      merged.push(event);
    }
  }

  console.log(`[ContextAssembler:Merge] Merged ${allEvents.length} events into ${merged.length} unique events`);
  return merged;
}

/**
 * Query candidate events using multi-strategy retrieval
 * PHASE 1 (WEEK 1-2): Enhanced with trending, popular, collaborative, and location strategies
 */
async function queryCandidateEvents(params: {
  freeText: string;
  searchWindow: { fromISO: string; toISO: string };
  city: string;
  userId?: string;
  profile: Profile;
}): Promise<CandidateEvent[]> {
  const { freeText, searchWindow, city, userId, profile } = params;

  try {
    // Extract category hints from free text
    const categoryHint = extractCategoryFromText(freeText);
    const keywords = extractKeywords(freeText);

    console.log(`[ContextAssembler] Multi-strategy search: category=${categoryHint || 'any'}, keywords=${keywords.join(', ') || 'none'}`);

    // STRATEGY 1: Semantic/Keyword search (existing logic)
    const whereClause: any = {
      city,
      startTime: {
        gte: new Date(searchWindow.fromISO),
        lte: new Date(searchWindow.toISO),
      },
    };

    if (categoryHint) {
      whereClause.category = categoryHint;
    }

    if (keywords.length > 0) {
      whereClause.OR = keywords.flatMap((keyword) => [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ]);
    }

    // Run all retrieval strategies in parallel
    const [semanticEvents, trendingEvents, popularEvents, collaborativeEvents, locationEvents] = await Promise.all([
      // Strategy 1: Semantic/Keyword search
      prisma.event.findMany({
        where: whereClause,
        take: 100,
        orderBy: { startTime: 'asc' },
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
      }),
      // Strategy 2: Trending events
      getTrendingEvents({ city, searchWindow, limit: 50 }),
      // Strategy 3: Popular by category
      getPopularByCategory({ city, searchWindow, categoryHint, limit: 100 }),
      // Strategy 4: Collaborative filtering
      getCollaborativeEvents({ userId, city, searchWindow, limit: 50 }),
      // Strategy 5: Location-based
      getLocationBasedEvents({ city, searchWindow, profile, limit: 100 }),
    ]);

    console.log(`[ContextAssembler] Strategy results - Semantic: ${semanticEvents.length}, Trending: ${trendingEvents.length}, Popular: ${popularEvents.length}, Collaborative: ${collaborativeEvents.length}, Location: ${locationEvents.length}`);

    // Merge and deduplicate results
    let events = deduplicateAndMerge([
      semanticEvents,
      trendingEvents,
      popularEvents,
      collaborativeEvents,
      locationEvents,
    ]);

    console.log(`[ContextAssembler] Found ${events.length} unique candidate events from all strategies`);

    // FALLBACK 1: If category filter returned 0 results, try related categories
    if (events.length === 0 && categoryHint) {
      const relatedCategories = getRelatedCategories(categoryHint);

      if (relatedCategories.length > 0) {
        console.log(`[ContextAssembler] No ${categoryHint} events found, trying related categories: ${relatedCategories.join(', ')}...`);

        const relatedWhere: any = {
          city,
          startTime: {
            gte: new Date(searchWindow.fromISO),
            lte: new Date(searchWindow.toISO),
          },
          category: { in: relatedCategories },
        };

        // Include keyword search with related categories
        if (keywords.length > 0) {
          relatedWhere.OR = keywords.flatMap((keyword) => [
            { title: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
          ]);
        }

        events = await prisma.event.findMany({
          where: relatedWhere,
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

        console.log(`[ContextAssembler] Related category search found ${events.length} events`);
      }
    }

    // FALLBACK 2: If still no results, try keyword search without category constraint
    // BUT only if we have enough meaningful keywords to avoid returning random results
    if (events.length === 0 && categoryHint) {
      const meaningfulKeywordCount = countMeaningfulKeywords(keywords);
      const MIN_KEYWORDS_FOR_BROAD_FALLBACK = 2;

      if (meaningfulKeywordCount >= MIN_KEYWORDS_FOR_BROAD_FALLBACK) {
        console.log(`[ContextAssembler] Still no events, broadening search with ${meaningfulKeywordCount} meaningful keywords...`);

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

        console.log(`[ContextAssembler] Final fallback search found ${events.length} events`);
      } else {
        console.log(`[ContextAssembler] Skipping broad fallback - only ${meaningfulKeywordCount} meaningful keywords (need ${MIN_KEYWORDS_FOR_BROAD_FALLBACK})`);
      }
    }

    // FALLBACK 3 (FINAL): If still no results after all strategies, return popular/diverse events
    // This prevents showing empty results and helps users discover what's available
    if (events.length === 0) {
      console.warn('[ContextAssembler] All search strategies returned 0 results, using popular events fallback');

      const popularFallbackWhere: any = {
        city,
        startTime: {
          gte: new Date(searchWindow.fromISO),
          lte: new Date(searchWindow.toISO),
        },
      };

      events = await prisma.event.findMany({
        where: popularFallbackWhere,
        take: 30,
        orderBy: [
          { category: 'asc' }, // Diversity across categories
          { startTime: 'asc' },
        ],
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

      console.log(`[ContextAssembler] Popular events fallback found ${events.length} events`);
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
 * Get related categories for fallback search
 * Helps find relevant alternatives when primary category has no events
 */
function getRelatedCategories(primaryCategory: string): string[] {
  const relatedCategoriesMap: Record<string, string[]> = {
    FITNESS: ['DANCE', 'WELLNESS', 'SPORTS'],
    MUSIC: ['DANCE', 'ARTS', 'THEATRE', 'COMEDY'],
    COMEDY: ['THEATRE', 'MUSIC', 'ARTS'],
    THEATRE: ['DANCE', 'MUSIC', 'ARTS', 'COMEDY'],
    DANCE: ['MUSIC', 'THEATRE', 'FITNESS'],
    ARTS: ['MUSIC', 'THEATRE', 'DANCE'],
    FOOD: ['NETWORKING', 'FAMILY'],
    NETWORKING: ['FOOD'],
    FAMILY: ['FOOD', 'ARTS'],
    OTHER: [],
  };

  return relatedCategoriesMap[primaryCategory] || [];
}

/**
 * Extract category hint from free text
 */
function extractCategoryFromText(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Add word boundaries for better matching
  const textWithBoundaries = ` ${lowerText} `;

  // Priority categories checked first (more specific terms)
  const priorityCategories: Array<{ patterns: string[]; category: string }> = [
    { patterns: ['fitness', 'workout', 'yoga', 'gym', 'exercise', 'pilates', 'crossfit'], category: 'FITNESS' },
    { patterns: ['comedy', 'standup', 'stand up', 'comedian', 'improv'], category: 'COMEDY' },
    { patterns: ['dance', 'dancing', 'ballet', 'choreography', 'salsa', 'tango'], category: 'DANCE' },
    { patterns: ['theatre', 'theater', 'play', 'musical', 'broadway'], category: 'THEATRE' },
    { patterns: ['music concert', 'live music', 'band', 'concert'], category: 'MUSIC' },
    { patterns: ['art', 'arts', 'gallery', 'museum', 'exhibition'], category: 'ARTS' },
    { patterns: ['food', 'restaurant', 'dining', 'brunch', 'dinner'], category: 'FOOD' },
    { patterns: ['networking', 'meetup', 'professional'], category: 'NETWORKING' },
    { patterns: ['family', 'kids', 'children'], category: 'FAMILY' },
  ];

  // Check priority categories first with word boundaries
  for (const { patterns, category } of priorityCategories) {
    for (const pattern of patterns) {
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(lowerText)) {
        return category;
      }
    }
  }

  // Fallback: check for generic "music" only if clearly standalone
  // Removed overly aggressive "show" fallback as it catches too many false positives
  if (textWithBoundaries.includes(' music ') && !textWithBoundaries.includes(' live music ') && !textWithBoundaries.includes(' music concert ')) {
    // Only use as fallback if "music" appears standalone (already checked live music/concert above)
    return 'MUSIC';
  }

  // No category match - return null to allow keyword-based search
  return null;
}

/**
 * Extract search keywords from free text
 */
function extractKeywords(text: string): string[] {
  // Remove common stopwords and extract meaningful keywords
  const stopwords = ['i', 'want', 'to', 'go', 'for', 'a', 'the', 'tonight', 'today', 'now', 'something', 'find', 'show', 'me', 'and', 'or', 'in', 'at', 'on'];

  // List of valid 2-character keywords that should NOT be filtered
  const validShortKeywords = ['dj', 'ai', 'vr', 'ar', 'ui', 'ux'];

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => {
      // Keep valid 2-char keywords
      if (validShortKeywords.includes(word)) return true;
      // Otherwise require length > 2 and not a stopword
      return word.length > 2 && !stopwords.includes(word);
    });

  return [...new Set(words)]; // Remove duplicates
}

/**
 * Count meaningful keywords (exclude very generic/weak words)
 * Used to determine if we have enough specificity for broad fallback searches
 */
function countMeaningfulKeywords(keywords: string[]): number {
  // Words that are too generic to provide good search specificity
  const weakKeywords = [
    'event', 'events', 'things', 'thing', 'activity', 'activities',
    'place', 'places', 'stuff', 'fun', 'cool', 'nice', 'good',
    'best', 'great', 'awesome', 'amazing', 'interesting'
  ];

  return keywords.filter(keyword => !weakKeywords.includes(keyword.toLowerCase())).length;
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
