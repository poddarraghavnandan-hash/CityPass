import type { ExtractedEvent } from './extraction';
export declare const OPENAI_PRICING: {
    readonly 'gpt-4o-mini': {
        readonly input: 0.15;
        readonly output: 0.6;
    };
    readonly 'gpt-4-turbo': {
        readonly input: 10;
        readonly output: 30;
    };
    readonly 'gpt-4o': {
        readonly input: 2.5;
        readonly output: 10;
    };
};
export type OpenAIModel = keyof typeof OPENAI_PRICING;
export declare function extractWithOpenAI(prompt: string, model: OpenAIModel): Promise<{
    data: ExtractedEvent;
    tokens: {
        input: number;
        output: number;
    };
}>;
export declare function calculateOpenAICost(model: OpenAIModel, tokens: {
    input: number;
    output: number;
}): number;
export declare function tierToOpenAIModel(tier: 'mini' | 'turbo' | 'flagship'): OpenAIModel;
export declare function extractWithOpenAIFunctions(prompt: string, model: OpenAIModel): Promise<{
    data: ExtractedEvent;
    tokens: {
        input: number;
        output: number;
    };
}>;
//# sourceMappingURL=extraction-openai.d.ts.map