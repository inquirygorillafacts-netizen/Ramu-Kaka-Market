
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

// This is a simplified, client-side cache for the key.
// It prevents reading from Firestore on every single AI call.
let geminiApiKey: string | null = null;

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
            console.error("Gemini API key document not found in Firestore.");
            throw new Error('Gemini API key document (`secure_configs/api_keys`) not found.');
        }
    } catch (error) {
        console.error("Error fetching Gemini API key from Firestore:", error);
        return null;
    }
}

    