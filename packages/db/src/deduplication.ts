import { prisma } from '@citypass/db';
import { cosineSimilarity, generateEmbedding } from '@citypass/llm';

interface DuplicateCandidate {
    id1: string;
    id2: string;
    score: number;
    reason: string;
}

/**
 * Find potential duplicate events using multiple signals
 */
export async function findDuplicateEvents(city: string = 'New York'): Promise<DuplicateCandidate[]> {
    const events = await prisma.event.findMany({
        where: {
            city,
            startTime: { gte: new Date() }
        },
        select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            venue: { select: { id: true, name: true } },
        },
        take: 10000, // Process in batches for large datasets
    });

    const duplicates: DuplicateCandidate[] = [];

    // Group by venue + time window (same venue, within 1 hour)
    for (let i = 0; i < events.length; i++) {
        for (let j = i + 1; j < events.length; j++) {
            const e1 = events[i];
            const e2 = events[j];

            // Skip if different venues
            if (e1.venue?.id !== e2.venue?.id) continue;

            // Check time proximity (within 1 hour)
            const timeDiff = Math.abs(e1.startTime.getTime() - e2.startTime.getTime());
            if (timeDiff > 60 * 60 * 1000) continue;

            // Check title similarity
            const titleSim = calculateStringSimilarity(e1.title, e2.title);
            if (titleSim > 0.8) {
                duplicates.push({
                    id1: e1.id,
                    id2: e2.id,
                    score: titleSim,
                    reason: `Same venue, similar time, title similarity: ${(titleSim * 100).toFixed(0)}%`
                });
            }
        }
    }

    return duplicates;
}

/**
 * Merge duplicate events, keeping the best version
 */
export async function mergeDuplicateEvents(id1: string, id2: string, keepId: string) {
    const discardId = keepId === id1 ? id2 : id1;

    await prisma.$transaction(async (tx) => {
        // Transfer any unique data from discarded event to kept event
        const kept = await tx.event.findUnique({ where: { id: keepId } });
        const discarded = await tx.event.findUnique({ where: { id: discardId } });

        if (!kept || !discarded) throw new Error('Event not found');

        // Update kept event with best data
        await tx.event.update({
            where: { id: keepId },
            data: {
                description: kept.description || discarded.description,
                imageUrl: kept.imageUrl || discarded.imageUrl,
                // Merge other fields as needed
            }
        });

        // Delete duplicate
        await tx.event.delete({ where: { id: discardId } });
    });
}

/**
 * Simple string similarity using Levenshtein distance
 */
function calculateStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1.0;

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}
