import { CrawlState } from '@citypass/types';
import { prisma } from '@citypass/db';

/**
 * Update job status
 */
export async function upsertEvents(state: CrawlState): Promise<Partial<CrawlState>> {
  console.log(`💾 Updating job status`);

  if (state.sourceId) {
    try {
      await prisma.source.update({
        where: { id: state.sourceId },
        data: {
          lastCrawled: new Date(),
          lastSuccess: state.extractedEvents.length > 0 ? new Date() : undefined,
        },
      });
    } catch (err) {
      console.error('Failed to update source:', err);
    }
  }

  console.log(`✅ Job complete`);
  return {};
}
