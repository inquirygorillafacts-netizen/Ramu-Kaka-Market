import { defineFlows } from '@genkit-ai/next';

// Import all flows directly to ensure they are registered.
import '@/ai/flows/get-cart-recommendations';
import '@/ai/flows/personalized-customer-entry';


export const { GET, POST } = defineFlows();
