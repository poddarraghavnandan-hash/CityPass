'use client';

type StreamCallbacks = {
  onMessage: (payload: { text: string }) => void;
  onComplete: (payload: any) => void;
  onError: (error: Error) => void;
};

export type ChatStreamPayload = {
  prompt: string;
  city?: string;
  tokens?: Record<string, unknown>;
  sessionId?: string;
};

/**
 * Minimal SSE client for streaming chat responses from /api/chat.
 * Handles aborts and differentiates between conversational text and structured payloads.
 */
export function streamChat(
  payload: ChatStreamPayload,
  callbacks: StreamCallbacks
) {
  const controller = new AbortController();
  let isClosed = false;
  let buffer = '';

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then((response) => {
      if (!response.ok || !response.body) {
        throw new Error('Chat stream unavailable');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const read = (): Promise<void> =>
        reader.read().then(({ done, value }) => {
          if (done || !value) {
            closeStream();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const chunk of parts) {
            const lines = chunk.split('\n');
            let event = 'message';
            let data = '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                event = line.replace('event:', '').trim();
              } else if (line.startsWith('data:')) {
                data += line.replace('data:', '').trim();
              }
            }

            handleEvent(event, data);
          }

          return read();
        });

      return read();
    })
    .catch((error) => {
      if (!isClosed) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
      closeStream();
    });

  function handleEvent(event: string, data: string) {
    if (event === 'message') {
      try {
        const parsed = JSON.parse(data);
        callbacks.onMessage(parsed);
      } catch {
        callbacks.onMessage({ text: data });
      }
      return;
    }

    if (event === 'payload') {
      try {
        const parsed = JSON.parse(data);
        callbacks.onComplete(parsed);
      } catch (error) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        closeStream();
      }
    }

    if (event === 'error') {
      callbacks.onError(new Error(data || 'Chat stream error'));
      closeStream();
    }
  }

  function closeStream() {
    if (!isClosed) {
      isClosed = true;
      controller.abort();
    }
  }

  return {
    cancel: closeStream,
  };
}
