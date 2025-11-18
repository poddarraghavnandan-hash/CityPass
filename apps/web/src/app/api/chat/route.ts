import { NextRequest } from 'next/server';
import { IntentionTokensSchema } from '@citypass/types';
import OpenAI from 'openai';

// Initialize OpenAI only if API key is available
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

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

        // Generate personalized summary using LLM with search results context
        let personalizedSummary = planPayload.reasons?.[0] ?? 'Ready with 3 slates.';
        if (openai) {
          try {
            // Collect events from all slates for context
            const allEvents = [
            ...(planPayload.slates?.best || []),
            ...(planPayload.slates?.wildcard || []),
            ...(planPayload.slates?.closeAndEasy || []),
          ].slice(0, 10); // Limit to top 10 events for context

          if (allEvents.length > 0) {
            const eventsContext = allEvents.map((event: any, idx: number) =>
              `${idx + 1}. ${event.title} at ${event.venueName || 'TBD'}${event.category ? ` (${event.category})` : ''}${event.priceMin !== undefined ? ` - $${event.priceMin}${event.priceMax ? `-$${event.priceMax}` : ''}` : ''}`
            ).join('\n');

            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `You are CityLens, a concise AI assistant helping users discover events in their city. Your responses should be:
- Brief and to-the-point (1-2 sentences max)
- Personalized based on their search intent
- Highlight what makes the recommendations special
- Conversational and friendly, not formal`
                },
                {
                  role: 'user',
                  content: `User asked: "${freeText}"

I found these events for them:
${eventsContext}

Mood: ${intention?.tokens?.mood || 'exploring'}
City: ${intention?.city || city}

Write a brief, personalized response (1-2 sentences) explaining what you found that matches their request.`
                }
              ],
              temperature: 0.7,
              max_tokens: 100,
            });

            personalizedSummary = completion.choices[0]?.message?.content || personalizedSummary;
            }
          } catch (llmError) {
            console.error('LLM summary generation failed:', llmError);
            // Fall back to default summary
          }
        }

        send('payload', {
          summary: personalizedSummary,
          intentionSummary: `${intention?.tokens?.mood ?? 'City'} · ${intention?.city ?? city}`,
          slates: planPayload.slates,
          reasons: planPayload.reasons,
          intention: planPayload.intention,
          traceId: planPayload.traceId,
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
