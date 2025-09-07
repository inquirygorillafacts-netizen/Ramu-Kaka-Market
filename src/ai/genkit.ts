
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
import {getDoc, doc} from 'firebase/firestore';
import {db} from '@/lib/firebase';

// This is a placeholder for the API key which will be fetched from Firestore.
let apiKey = process.env.GEMINI_API_KEY || "YOUR_FALLBACK_API_KEY_HERE";

/**
 * Fetches the Gemini API key from a secure document in Firestore.
 * Caches the key after the first fetch to avoid repeated database reads.
 */
async function getApiKey(): Promise<string> {
    // If the key is the default one, try fetching it from Firestore.
    if (apiKey === "YOUR_FALLBACK_API_KEY_HERE") {
        try {
            const configDocRef = doc(db, 'secure_configs', 'api_keys');
            const docSnap = await getDoc(configDocRef);

            if (docSnap.exists() && docSnap.data().gemini_key) {
                console.log("Fetched API key from Firestore.");
                apiKey = docSnap.data().gemini_key;
            } else {
                console.warn("API key document not found in Firestore. Using fallback key.");
            }
        } catch (error) {
            console.error("Error fetching API key from Firestore:", error);
            // In case of error, it will proceed with the fallback key.
        }
    }
    return apiKey;
}


export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is now provided by our async function.
      apiKey: getApiKey,
    }),
  ],
  model: 'googleai/gemini-1.5-flash-latest',
});
