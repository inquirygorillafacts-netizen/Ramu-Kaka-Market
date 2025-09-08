
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {getDoc, doc} from 'firebase/firestore';
import {db} from '@/lib/firebase';

// This is a simplified, server-side cache for the keys.
// It prevents reading from Firestore on every single API call.
let keyCache: {
    gemini_key: string;
} | null = null;

/**
 * Fetches the API keys from a secure document in Firestore.
 * Caches the keys after the first fetch to avoid repeated database reads.
 */
async function getApiKeys(): Promise<{ gemini_key: string }> {
    if (keyCache) {
        return keyCache;
    }
    
    try {
        const configDocRef = doc(db, 'secure_configs', 'api_keys');
        const docSnap = await getDoc(configDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (!data.gemini_key) {
                throw new Error('gemini_key not found in Firestore document.');
            }
            // Store the fetched keys in the cache
            keyCache = {
                gemini_key: data.gemini_key,
            };
            
            // Optional: Clear cache after some time (e.g., 1 hour) to refetch keys
            setTimeout(() => { keyCache = null; }, 3600 * 1000);

            return keyCache;

        } else {
            console.error("API key document not found in Firestore.");
            throw new Error('API key document (`secure_configs/api_keys`) not found.');
        }
    } catch (error) {
        console.error("Error fetching API keys from Firestore:", error);
        // Re-throw the error to be caught by the caller
        throw new Error('Could not retrieve API credentials from Firestore.');
    }
}

// Initialize Genkit with plugins and the dynamic API key.
// The apiKey is provided as an async function, which Genkit will `await`
// before making any calls to the Google AI service.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: async () => (await getApiKeys()).gemini_key,
    }),
  ],
});
