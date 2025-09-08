
'use server';

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Fetches the Gemini API key from Firestore on every call.
 * This ensures that the latest key from the database is always used.
 * It reads from the 'secure_configs/api_keys' document.
 */
export async function getGeminiApiKey(): Promise<string | null> {
    try {
        const configDocRef = doc(db, 'secure_configs', 'api_keys');
        const docSnap = await getDoc(configDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Ensure the field name matches what's in Firestore.
            const apiKey = data.gemini_key; 
            if (apiKey) {
                return apiKey;
            }
        }
        console.error("Gemini API key ('gemini_key') not found in Firestore document 'secure_configs/api_keys'.");
        return null;
    } catch (error) {
        console.error("Error fetching Gemini API key from Firestore:", error);
        return null;
    }
}
