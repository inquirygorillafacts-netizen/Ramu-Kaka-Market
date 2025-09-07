
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {getDoc, doc} from 'firebase/firestore';
import {db} from '@/lib/firebase';

// This is a placeholder for the API key which will be fetched from Firestore.
let apiKey = "YOUR_FALLBACK_API_KEY_HERE";
let razorpayKeyId = "YOUR_FALLBACK_RAZORPAY_KEY_ID";
let razorpayKeySecret = "YOUR_FALLBACK_RAZORPAY_KEY_SECRET";

// Cache for the fetched keys
const keyCache = {
    gemini_key: '',
    razorpay_key_id: '',
    razorpay_key_secret: '',
};


/**
 * Fetches the API keys from a secure document in Firestore.
 * Caches the keys after the first fetch to avoid repeated database reads.
 */
async function getApiKeys(): Promise<{ gemini_key: string, razorpay_key_id: string, razorpay_key_secret: string }> {
    if (keyCache.gemini_key) {
        return keyCache;
    }
    
    try {
        const configDocRef = doc(db, 'secure_configs', 'api_keys');
        const docSnap = await getDoc(configDocRef);

        if (docSnap.exists()) {
            console.log("Fetched API keys from Firestore.");
            const data = docSnap.data();
            keyCache.gemini_key = data.gemini_key || '';
            keyCache.razorpay_key_id = data.razorpay_key_id || '';
            keyCache.razorpay_key_secret = data.razorpay_key_secret || '';

             if (!keyCache.gemini_key) console.warn("Gemini API key is missing in Firestore document.");
             if (!keyCache.razorpay_key_id) console.warn("Razorpay Key ID is missing in Firestore document.");
             if (!keyCache.razorpay_key_secret) console.warn("Razorpay Key Secret is missing in Firestore document.");

        } else {
            console.warn("API key document not found in Firestore. Using fallback keys.");
        }
    } catch (error) {
        console.error("Error fetching API keys from Firestore:", error);
    }

    if (!keyCache.gemini_key) keyCache.gemini_key = apiKey;

    return keyCache;
}


export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is now provided by our async function.
      apiKey: async () => (await getApiKeys()).gemini_key,
    }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
