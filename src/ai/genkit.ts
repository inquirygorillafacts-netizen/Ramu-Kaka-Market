
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {getDoc, doc} from 'firebase/firestore';
import {db} from '@/lib/firebase';

// This is a simplified, server-side cache for the keys.
let keyCache: {
    gemini_key: string;
    razorpay_key_id: string;
    razorpay_key_secret: string;
} | null = null;

/**
 * Fetches the API keys from a secure document in Firestore.
 * Caches the keys after the first fetch to avoid repeated database reads.
 */
async function getApiKeys(): Promise<{ gemini_key: string, razorpay_key_id: string, razorpay_key_secret: string }> {
    if (keyCache) {
        return keyCache;
    }
    
    try {
        const configDocRef = doc(db, 'secure_configs', 'api_keys');
        const docSnap = await getDoc(configDocRef);

        if (docSnap.exists()) {
            console.log("Fetched API keys from Firestore.");
            const data = docSnap.data();
            keyCache = {
                gemini_key: data.gemini_key || '',
                razorpay_key_id: data.razorpay_key_id || '',
                razorpay_key_secret: data.razorpay_key_secret || '',
            };
            // Set a timeout to clear the cache after some time to refetch keys, e.g., 1 hour
            setTimeout(() => { keyCache = null; }, 3600 * 1000);

            return keyCache;

        } else {
            console.warn("API key document not found in Firestore.");
            throw new Error('API key document not found.');
        }
    } catch (error) {
        console.error("Error fetching API keys from Firestore:", error);
        throw new Error('Could not retrieve API Key.');
    }
}

// Initialize Genkit with plugins and the dynamic API key.
// This is the correct modern syntax.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: async () => (await getApiKeys()).gemini_key,
    }),
  ],
});
