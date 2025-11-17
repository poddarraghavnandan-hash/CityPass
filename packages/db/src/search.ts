/**
 * Database-only search fallback
 * Uses PostgreSQL full-text search when Typesense/Qdrant unavailable
 */

import { prisma } from './index';
import type { Event, EventCategory } from '@prisma/client';

export interface DatabaseSearchOptions {
  q?: string;
  city?: string;
  category?: EventCategory;
  dateFrom?: Date;
  dateTo?: Date;
  priceMax?: number;
  limit?: number;
  offset?: number;
}

export interface DatabaseSearchResult {
  events: Event[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Search events using PostgreSQL full-text search
 * Fallback when Typesense is unavailable
 */
export async function searchEventsInDatabase(
  options: DatabaseSearchOptions
): Promise<DatabaseSearchResult> {
  const {
    q,
    city,
    category,
    dateFrom,
    dateTo,
    priceMax,
    limit = 20,
    offset = 0,
  } = options;

  const now = new Date();

  // Build where clause
  const where: any = {
    startTime: {
      gte: dateFrom || now,
      ...(dateTo && { lte: dateTo }),
    },
  };

  if (city) {
    where.city = { equals: city, mode: 'insensitive' };
  }

  if (category) {
    where.category = category;
  }

  if (priceMax !== undefined) {
    where.OR = [
      { priceMin: { lte: priceMax } },
      { priceMin: null },
    ];
  }

  // Add text search if query provided
  if (q && q.trim()) {
    const searchTerm = q.trim();
    where.OR = [
      { title: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { venueName: { contains: searchTerm, mode: 'insensitive' } },
      { neighborhood: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  // Execute query
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: [
        { startTime: 'asc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events,
    total,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get upcoming events for discover feed
 */
export async function getUpcomingEvents(
  city: string,
  options: {
    limit?: number;
    offset?: number;
    category?: EventCategory;
  } = {}
): Promise<DatabaseSearchResult> {
  const { limit = 20, offset = 0, category } = options;

  const where: any = {
    city: { equals: city, mode: 'insensitive' },
    startTime: { gte: new Date() },
  };

  if (category) {
    where.category = category;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: [
        { startTime: 'asc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events,
    total,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
  };
}
