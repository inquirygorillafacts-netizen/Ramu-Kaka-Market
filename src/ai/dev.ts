import { config } from 'dotenv';
config();

// This file is the entrypoint for Genkit's development tooling.
// It should be imported by the Genkit API route handler.
import '@/ai/flows/personalized-customer-entry';
import '@/ai/flows/get-cart-recommendations';
