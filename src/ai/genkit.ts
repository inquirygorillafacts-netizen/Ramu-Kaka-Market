'use server';

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {getGeminiApiKey} from '@/lib/gemini';
import {googleCloud} from '@genkit-ai/google-cloud';

export const ai = genkit({
  plugins: [
    googleCloud(),
    googleAI({
      apiKey: getGeminiApiKey,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
