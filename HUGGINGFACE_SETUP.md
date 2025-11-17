# HuggingFace API Key Setup

## Get Your Free API Key

1. **Sign up/Login**: Visit https://huggingface.co/join (free account)

2. **Create Access Token**:
   - Go to https://huggingface.co/settings/tokens
   - Click "New token"
   - Name: "citypass-event-extraction"
   - Type: Select "Read"
   - Click "Generate token"
   - Copy the token (starts with `hf_...`)

3. **Add to Environment**:

   Open `.env.local` and add:
   ```
   HUGGINGFACE_API_KEY=hf_your_token_here
   ```

4. **Supported Models** (with API key):
   - meta-llama/Llama-3.2-3B-Instruct (current default)
   - mistralai/Mistral-7B-Instruct-v0.2
   - google/flan-t5-xxl

## Note
- Free tier has rate limits but should work for our use case
- Some models require accepting their license agreement on HuggingFace first
- Much faster than local Ollama on CPU

Once you have the key, run:
```bash
pnpm exec tsx scripts/extract-events.ts
```
