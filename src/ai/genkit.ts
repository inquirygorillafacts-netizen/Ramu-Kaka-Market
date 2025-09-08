//
// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {genkit, type GenkitErrorCode, type GenkitError} from 'genkit';
import {googleAI, type GoogleAIGeminiModel} from '@genkit-ai/googleai';
import {firebase} from '@genkit-ai/firebase';
import {dotprompt} from '@genkit-ai/dotprompt';
import {doc, getDoc} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {z} from 'genkit';

// This is a simplified, client-side cache for the key.
// It prevents reading from Firestore on every single AI call.
let geminiApiKey: string | null = null;
let razorpayKeys: {key_id: string; key_secret: string} | null = null;

/**
 * Fetches the Gemini API key from a secure document in Firestore.
 * Caches the key after the first fetch to avoid repeated database reads.
 * WARNING: This function is intended for client-side use and exposes the API key
 * to the browser. This is a security risk. In a production environment,
 * AI calls should be proxied through a secure backend.
 */
export async function getGeminiApiKey(): Promise<string | null> {
  if (geminiApiKey) {
    return geminiApiKey;
  }

  try {
    const configDocRef = doc(db, 'secure_configs', 'api_keys');
    const docSnap = await getDoc(configDocRef);

    if (docSnap.exists() && docSnap.data().gemini_key) {
      geminiApiKey = docSnap.data().gemini_key;
      return geminiApiKey;
    } else {
      console.error('Gemini API key document not found in Firestore.');
      throw new Error(
        'Gemini API key document (`secure_configs/api_keys`) not found.'
      );
    }
  } catch (error) {
    console.error('Error fetching Gemini API key from Firestore:', error);
    return null;
  }
}

export async function getRazorpayKeys(): Promise<{
  key_id: string;
  key_secret: string;
} | null> {
  if (razorpayKeys) {
    return razorpayKeys;
  }

  try {
    const configDocRef = doc(db, 'secure_configs', 'api_keys');
    const docSnap = await getDoc(configDocRef);

    if (
      docSnap.exists() &&
      docSnap.data().razorpay_key_id &&
      docSnap.data().razorpay_key_secret
    ) {
      razorpayKeys = {
        key_id: docSnap.data().razorpay_key_id,
        key_secret: docSnap.data().razorpay_key_secret,
      };
      return razorpayKeys;
    } else {
      console.error('Razorpay keys document not found in Firestore.');
      throw new Error(
        'Razorpay keys document (`secure_configs/api_keys`) not found.'
      );
    }
  } catch (error) {
    console.error('Error fetching Razorpay keys from Firestore:', error);
    return null;
  }
}

export const ai = genkit({
  plugins: [
    firebase(),
    googleAI({
      apiKey: getGeminiApiKey,
    }),
    dotprompt({
      promptDir: './src/ai/prompts',
    }),
  ],
  logSinks: [
    {
      name: 'firebase',
      log(log) {
        // console.log('log sink', JSON.stringify(log, null, 2));
      },
      async flush() {},
    },
  ],
  flowStateStore: 'firebase',
  traceStore: 'firebase',
  enableTracingAndMetrics: true,
});
