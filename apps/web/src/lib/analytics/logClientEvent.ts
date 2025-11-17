type EventType =
  | 'query'
  | 'slate_impression'
  | 'card_view'
  | 'click_route'
  | 'click_book'
  | 'save'
  | 'hide'
  | 'reask'
  | 'error'
  | 'profile_update'
  | 'onboarding_update';

type BasePayload = {
  traceId?: string;
  slateLabel?: string;
  eventId?: string;
  eventIds?: string[];
  position?: number;
  screen: 'chat' | 'feed' | 'profile' | 'onboarding' | 'investors' | 'landing';
  intention?: unknown;
  [key: string]: any;
};

const queue: { type: EventType; payload: BasePayload }[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 750;
const MAX_BATCH = 20;

export async function logClientEvent(type: EventType, payload: BasePayload) {
  try {
    queue.push({ type, payload });
    scheduleFlush();
  } catch (error) {
    // Swallow any unexpected error; we never block UI
    console.warn('logClientEvent error', error);
  }
}

function scheduleFlush() {
  if (flushTimeout) return;
  flushTimeout = setTimeout(async () => {
    flushTimeout = null;
    if (!queue.length) return;
    const batch = queue.splice(0, MAX_BATCH);
    try {
      await fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
      });
    } catch (error) {
      console.warn('client-log network failure', error);
      // Re-queue on failure to avoid losing critical signals
      batch.forEach((item) => queue.unshift(item));
      scheduleFlush();
    }
  }, FLUSH_INTERVAL_MS);
}
