
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
            return keyCache;

        } else {
            console.warn("API key document not found in Firestore.");
        }
    } catch (error) {
        console.error("Error fetching API keys from Firestore:", error);
    }
    
    // Return empty strings as a fallback if keys aren't found.
    return {
        gemini_key: "",
        razorpay_key_id: '',
        razorpay_key_secret: '',
    };
}

// Initialize Genkit with plugins and the dynamic API key.
// This is the correct modern syntax.
export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: async () => (await getApiKeys()).gemini_key,
    }),
  ],
  // This model definition is not strictly necessary here but can be a good default.
  // Flows will specify their own models.
  model: 'googleai/gemini-1.5-flash-latest', 
});
