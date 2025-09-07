
'use server';

/**
 * @fileOverview A flow that provides personalized recommendations based on items in a customer's cart.
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

const getCartRecsPrompt = ai.definePrompt(
    {
      name: 'getCartRecommendationsPrompt',
      input: { schema: GetCartRecommendationsInputSchema },
      output: { schema: GetCartRecommendationsOutputSchema },
      model: 'googleai/gemini-1.5-flash',
      prompt: `You are a friendly and helpful AI assistant for "Ramu Kaka Market", a local grocery store in a village in India. Your persona is like a helpful local shopkeeper who speaks Hindi.

Your task is to provide a warm, personalized greeting and a useful product recommendation based on the customer's cart. The entire output must be in simple, conversational HINDI.

- Address the customer warmly in Hindi. Use their name, like "Namaste [Customer Name] ji," or a friendly, respectful term like "Namaste Bhabhi ji," or "Namaste Bhaiya,".
- Look at the items in their cart.
- Suggest one other item in Hindi that would go well with what they're already buying. For example, if they have 'Palak' (spinach), you could suggest 'Chana Dal' for 'Dal Palak'. If they have potatoes, you could suggest onions.
- Keep the tone very simple, helpful, and personal, like a real shopkeeper would talk.

Example Interaction:
- Customer Name: Priya
- Items in Cart: Palak, Tamatar
- Your Greeting (Hindi): नमस्ते प्रिया जी,
- Your Recommendation (Hindi): आपने पालक लिया है, इसके साथ चना दाल बहुत अच्छी लगेगी दाल-पालक बनाने के लिए!

Customer Name: {{{customerName}}}
Items in Cart: {{{cartItems}}}

Provide the output in the specified JSON format, with both greeting and recommendation in HINDI.
`,
    },
  );


const getCartRecommendationsFlow = ai.defineFlow(
  {
    name: 'getCartRecommendationsFlow',
    inputSchema: GetCartRecommendationsInputSchema,
    outputSchema: GetCartRecommendationsOutputSchema,
  },
  async (input) => {
    const { output } = await getCartRecsPrompt(input);
    if (!output) {
      throw new Error("Failed to get recommendation from AI.");
    }
    return output;
  }
);


export async function getCartRecommendations(
  input: GetCartRecommendationsInput
): Promise<GetCartRecommendationsOutput> {
  return await getCartRecommendationsFlow(input);
}
