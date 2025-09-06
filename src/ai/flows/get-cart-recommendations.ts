
'use server';

/**
 * @fileOverview A flow that provides personalized recommendations based on items in a customer's cart.
 *
 * - getCartRecommendations - A function that handles the recommendation process.
 * - GetCartRecommendationsInput - The input type for the getCartRecommendations function.
 * - GetCartRecommendationsOutput - The return type for the getCartRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  greeting: z.string().describe('A short, friendly greeting for the customer, addressing them in a familiar tone like "Bhabhi ji" or "Bhaiya".'),
  recommendation: z
    .string()
    .describe('A helpful and relevant recommendation based on the cart items.'),
});
export type GetCartRecommendationsOutput = z.infer<
  typeof GetCartRecommendationsOutputSchema
>;

export async function getCartRecommendations(
  input: GetCartRecommendationsInput
): Promise<GetCartRecommendationsOutput> {
  return getCartRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getCartRecommendationsPrompt',
  input: {schema: GetCartRecommendationsInputSchema},
  output: {schema: GetCartRecommendationsOutputSchema},
  prompt: `You are a friendly and helpful AI assistant for "Ramu Kaka Market", a local grocery store in a village in India. Your persona is like a helpful local shopkeeper.

  Your task is to provide a warm, personalized greeting and a useful product recommendation based on the customer's cart.

  - Address the customer warmly. Use their name, like "Namaste [Customer Name] ji," or a friendly, respectful term like "Namaste Bhabhi ji," or "Namaste Bhaiya,".
  - Look at the items in their cart.
  - Suggest one other item that would go well with what they're already buying. For example, if they have 'Palak' (spinach), you could suggest 'Chana Dal' for 'Dal Palak'. If they have potatoes, you could suggest onions.
  - Keep the tone very simple, helpful, and personal, like a real shopkeeper would talk.

  Customer Name: {{{customerName}}}
  Items in Cart: {{{cartItems}}}

  Provide the output in the specified JSON format.
  `,
});

const getCartRecommendationsFlow = ai.defineFlow(
  {
    name: 'getCartRecommendationsFlow',
    inputSchema: GetCartRecommendationsInputSchema,
    outputSchema: GetCartRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
