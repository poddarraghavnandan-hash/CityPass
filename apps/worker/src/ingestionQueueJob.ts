import { prisma, IngestionRequestStatus } from '@citypass/db';
import { processSource } from './processSource';

const QUEUE_BATCH_LIMIT = parseInt(process.env.CITYLENS_QUEUE_BATCH ?? '1', 10);

export async function processIngestionQueue() {
  let processed = 0;

  for (let i = 0; i < QUEUE_BATCH_LIMIT; i++) {
    const claimed = await claimNextRequest();
    if (!claimed) {
      break;
    }

    const { request } = claimed;

    try {
      const summary = await fulfillRequest(request.id, request.city);
      await prisma.ingestionRequest.update({
        where: { id: request.id },
        data: {
          status: IngestionRequestStatus.COMPLETED,
          processedAt: new Date(),
          resultSummary: summary,
          lastError: null,
        },
      });
      processed += 1;
    } catch (error: any) {
      await prisma.ingestionRequest.update({
        where: { id: request.id },
        data: {
          status: IngestionRequestStatus.FAILED,
          processedAt: new Date(),
          lastError: error?.message || String(error),
        },
      });
    }
  }

  return { processed };
}

async function claimNextRequest() {
  const request = await prisma.ingestionRequest.findFirst({
    where: { status: IngestionRequestStatus.PENDING },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });

  if (!request) {
    return null;
  }

  const updated = await prisma.ingestionRequest.updateMany({
    where: { id: request.id, status: IngestionRequestStatus.PENDING },
    data: {
      status: IngestionRequestStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    return null;
  }

  return { request };
}

async function fulfillRequest(requestId: string, city: string) {
  const sources = await prisma.source.findMany({
    where: {
      city,
      active: true,
    },
    select: { id: true },
  });

  if (sources.length === 0) {
    throw new Error(`No active sources configured for ${city}`);
  }

  const beforeCount = await prisma.event.count({
    where: {
      city,
      startTime: { gte: new Date() },
    },
  });

  for (const source of sources) {
    await processSource(source.id);
  }

  const afterCount = await prisma.event.count({
    where: {
      city,
      startTime: { gte: new Date() },
    },
  });

  return {
    requestId,
    city,
    processedSources: sources.length,
    eventsBefore: beforeCount,
    eventsAfter: afterCount,
    delta: afterCount - beforeCount,
  };
}
