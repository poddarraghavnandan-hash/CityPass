
import { generateResponse, generateStreamingResponse } from '@citypass/llm';

async function main() {
    console.log('--- Debugging Generation Logic ---');
    console.log(`LLM_PROVIDER: ${process.env.LLM_PROVIDER}`);
    console.log(`OPENAI_API_KEY present: ${!!process.env.OPENAI_API_KEY}`);

    // 1. Test Standard Generation
    console.log('\n[Test 1] Standard Generation...');
    try {
        const response = await generateResponse('Say "Hello World" and nothing else.');
        console.log(`[Response] "${response}"`);
    } catch (error) {
        console.error('[Error] Generation failed:', error);
    }

    // 2. Test Streaming Generation
    console.log('\n[Test 2] Streaming Generation...');
    try {
        process.stdout.write('[Stream] ');
        await generateStreamingResponse(
            'Count from 1 to 5.',
            undefined,
            (chunk) => process.stdout.write(chunk)
        );
        console.log('\n[Stream] Done');
    } catch (error) {
        console.error('[Error] Streaming failed:', error);
    }
}

main().catch(console.error);
