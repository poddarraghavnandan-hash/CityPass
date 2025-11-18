import { prisma } from './index';
export async function searchEventsInDatabase(options) {
    const { q, city, category, dateFrom, dateTo, priceMax, limit = 20, offset = 0, } = options;
    const now = new Date();
    const where = {
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
    if (q && q.trim()) {
        const searchTerm = q.trim();
        where.OR = [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { venueName: { contains: searchTerm, mode: 'insensitive' } },
            { neighborhood: { contains: searchTerm, mode: 'insensitive' } },
        ];
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
export async function getUpcomingEvents(city, options = {}) {
    const { limit = 20, offset = 0, category } = options;
    const where = {
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
//# sourceMappingURL=search.js.map