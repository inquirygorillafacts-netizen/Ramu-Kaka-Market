
'use server';

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Fetches the Gemini API key from Firestore on every call.
 * This ensures that any changes to the key in the database are immediately reflected.
 * WARNING: This function is intended for client-side use and exposes the API key
 * to the browser. This is a security risk. In a production environment,
 * AI calls should be proxied through a secure backend.
 */
export async function getGeminiApiKey(): Promise<string | null> {
    try {
        const configDocRef = doc(db, 'secure_configs', 'api_keys');
        const docSnap = await getDoc(configDocRef);

        if (docSnap.exists() && docSnap.data().gemini_key) {
            const apiKey = docSnap.data().gemini_key;
            return apiKey;
        } else {
            console.error("Gemini API key document not found in Firestore.");
            throw new Error('Gemini API key document (`secure_configs/api_keys`) not found.');
        }
    } catch (error) {
        console.error("Error fetching Gemini API key from Firestore:", error);
        return null;
    }
}
