
'use server';

/**
 * @fileOverview A flow that provides personalized recommendations based on items in a customer's cart.
 *
 * THIS FLOW IS DEPRECATED AND SHOULD NOT BE USED.
 * The logic has been moved to the client-side in `src/app/customer/cart/page.tsx`
 * as per the user's request. This file is kept for historical purposes but will be removed.
 *
 * - getCartRecommendations - A function that handles the recommendation process.
 * - GetCartRecommendationsInput - The input type for the getCartRecommendations function.
 * - GetCartRecommendationsOutput - The return type for the getCartRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GetCartRecommendationsInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  cartItems: z
    .string()
    .describe('A comma-separated string of items in the customer\'s cart.'),
});
export type GetCartRecommendationsInput = z.infer<
  typeof GetCartRecommendationsInputSchema
>;

const GetCartRecommendationsOutputSchema = z.object({
  greeting: z.string().describe('A short, friendly greeting for the customer in Hindi, addressing them in a familiar tone like "Bhabhi ji" or "Bhayia".'),
  recommendation: z
    .string()
    .describe('A helpful and relevant recommendation in Hindi based on the cart items.'),
});
export type GetCartRecommendationsOutput = z.infer<
  typeof GetCartRecommendationsOutputSchema
>;

export async function getCartRecommendations(
  input: GetCartRecommendationsInput
): Promise<GetCartRecommendationsOutput> {
  // This is a deprecated flow.
  throw new Error("This AI flow is deprecated and should not be called.");
}
