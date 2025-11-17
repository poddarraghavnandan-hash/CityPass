import { NextRequest } from 'next/server';
import { IntentionTokensSchema } from '@citypass/types';

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Support both prompt (old) and messages (new) formats
  let freeText = '';
  if (body.prompt) {
    freeText = body.prompt as string;
  } else if (body.messages && Array.isArray(body.messages)) {
    // Extract last user message from messages array
    const lastUserMessage = body.messages.filter((m: any) => m.role === 'user').pop();
    freeText = lastUserMessage?.content || '';
  }

  const city = (body.city as string) ?? process.env.NEXT_PUBLIC_DEFAULT_CITY ?? 'New York';
  const rawTokens = body.tokens ? IntentionTokensSchema.partial().parse(body.tokens) : undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\n` + `data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const intentionResponse = await fetch(`${req.nextUrl.origin}/api/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freeText,
            context: { city, overrides: rawTokens },
          }),
        });
        if (!intentionResponse.ok) {
          throw new Error('Unable to understand request.');
        }
        const intentionPayload = await intentionResponse.json();
        const intention = intentionPayload.intention ?? intentionPayload.tokens;
        send('message', { text: `Okay, curating ${intention?.tokens?.mood ?? 'city'} mood…` });

        const planResponse = await fetch(`${req.nextUrl.origin}/api/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            freeText,
            tokens: rawTokens,
            user: intention?.user,
          }),
        });

        if (!planResponse.ok) {
          throw new Error('Unable to plan recommendations.');
        }

        const planPayload = await planResponse.json();
        send('payload', {
          summary: planPayload.reasons?.[0] ?? 'Ready with 3 slates.',
          intentionSummary: `${intention?.tokens?.mood ?? 'City'} · ${intention?.city ?? city}`,
          slates: planPayload.slates,
          reasons: planPayload.reasons,
          intention: planPayload.intention,
        });
      } catch (error: any) {
        send('error', error?.message || 'Chat failed');
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    },
  });
}
