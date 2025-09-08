
'use server';

/**
 * Fetches the Gemini API key directly from the environment variables.
 * This is a more reliable method for the frontend as it avoids Firestore
 * permission or network issues.
 *
 * The key should be stored in a `.env.local` file with the name `NEXT_PUBLIC_GEMINI_API_KEY`.
 */
export async function getGeminiApiKey(): Promise<string | null> {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (apiKey) {
        return apiKey;
    } else {
        console.error("Gemini API key not found in environment variables (NEXT_PUBLIC_GEMINI_API_KEY).");
        return null;
    }
}
