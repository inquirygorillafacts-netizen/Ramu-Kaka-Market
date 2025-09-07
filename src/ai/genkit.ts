
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {getDoc, doc} from 'firebase/firestore';
import {db} from '@/lib/firebase';

// This is a placeholder for the API key which will be fetched from Firestore.
let apiKey = "YOUR_FALLBACK_API_KEY_HERE";

// Cache for the fetched keys
const keyCache: {
    gemini_key: string;
    razorpay_key_id: string;
    razorpay_key_secret: string;
} | null = null;


/**
 * Fetches the API keys from a secure document in Firestore.
 * Caches the keys after the first fetch to avoid repeated database reads.
 */
async function getApiKeys(): Promise<{ gemini_key: string, razorpay_key_id: string, razorpay_key_secret: string }> {
    // This function now only fetches from Firestore if the cache is empty.
    if (keyCache) {
        return keyCache;
    }
    
    try {
        const configDocRef = doc(db, 'secure_configs', 'api_keys');
        const docSnap = await getDoc(configDocRef);

        if (docSnap.exists()) {
            console.log("Fetched API keys from Firestore.");
            const data = docSnap.data();
            const fetchedKeys = {
                gemini_key: data.gemini_key || '',
                razorpay_key_id: data.razorpay_key_id || '',
                razorpay_key_secret: data.razorpay_key_secret || '',
            };

            if (!fetchedKeys.gemini_key) console.warn("Gemini API key is missing in Firestore document.");
            if (!fetchedKeys.razorpay_key_id) console.warn("Razorpay Key ID is missing in Firestore document.");
            if (!fetchedKeys.razorpay_key_secret) console.warn("Razorpay Key Secret is missing in Firestore document.");
            
            // @ts-ignore
            keyCache = fetchedKeys; // Cache the fetched keys
            // @ts-ignore
            return keyCache;

        } else {
            console.warn("API key document not found in Firestore. Using fallback keys.");
        }
    } catch (error) {
        console.error("Error fetching API keys from Firestore:", error);
    }
    
    // Fallback to placeholder if still no key.
    const fallbackKeys = {
        gemini_key: apiKey,
        razorpay_key_id: '',
        razorpay_key_secret: '',
    };
    
    // @ts-ignore
    keyCache = fallbackKeys;
    // @ts-ignore
    return keyCache;
}


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
