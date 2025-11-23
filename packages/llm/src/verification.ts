import OpenAI from 'openai';

export interface VerificationResult {
    isValid: boolean;
    confidence: number; // 0-1
    issues: string[];
    correctedData?: any;
}

// Lazy-init OpenAI client
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
    }
    return openai;
}

/**
 * Verify event data using LLM
 * Checks for consistency, realistic values, and missing information
 */
export async function verifyEventData(event: any): Promise<VerificationResult> {
    const client = getOpenAI();

    const prompt = `
    Analyze the following event data for quality and consistency.
    
    Event Data:
    ${JSON.stringify(event, null, 2)}
    
    Check for:
    1. Missing critical fields (title, startTime, location).
    2. Unrealistic prices (e.g., extremely high or low for the category).
    3. Mismatched category vs title/description.
    4. Suspicious or placeholder content (e.g., "Test Event", "Lorem Ipsum").
    5. Consistency between start and end times.

    Return a JSON object with the following structure:
    {
      "isValid": boolean,
      "confidence": number (0.0 to 1.0),
      "issues": string[],
      "correctedData": object (optional, only if minor fixes are needed like typos or formatting)
    }
  `;

    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a data quality expert for an event discovery platform. Output ONLY valid JSON.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Empty response from LLM');
        }

        const result = JSON.parse(content) as VerificationResult;
        return result;
    } catch (error) {
        console.error('Verification failed:', error);
        // Fallback to valid but low confidence
        return {
            isValid: true,
            confidence: 0.5,
            issues: ['Verification failed due to technical error'],
        };
    }
}
