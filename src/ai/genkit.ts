
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {getGeminiApiKey} from '@/lib/gemini';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: getGeminiApiKey,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
