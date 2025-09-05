'use server';

/**
 * @fileOverview Personalized customer entry flow that determines personalized content (promotions, recommendations, etc.) for a customer upon login.
 *
 * - personalizeCustomerEntry - A function that orchestrates the personalization process.
 * - PersonalizeCustomerEntryInput - The input type for the personalizeCustomerEntry function.
 * - PersonalizeCustomerEntryOutput - The return type for the personalizeCustomerEntry function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizeCustomerEntryInputSchema = z.object({
  customerId: z
    .string()
    .describe('The unique identifier for the customer.'),
  customerName: z.string().describe('The name of the customer.'),
  customerPurchaseHistory: z
    .string()
    .describe('The purchase history of the customer.'),
  customerPreferences: z
    .string()
    .describe('Any explicitly stated preferences of the customer.'),
});
export type PersonalizeCustomerEntryInput =
  z.infer<typeof PersonalizeCustomerEntryInputSchema>;

const PersonalizeCustomerEntryOutputSchema = z.object({
  personalizedPromotions: z
    .string()
    .describe('Personalized promotions for the customer.'),
  personalizedRecommendations: z
    .string()
    .describe('Personalized product recommendations for the customer.'),
  welcomeMessage: z.string().describe('A personalized welcome message.'),
});
export type PersonalizeCustomerEntryOutput =
  z.infer<typeof PersonalizeCustomerEntryOutputSchema>;

export async function personalizeCustomerEntry(
  input: PersonalizeCustomerEntryInput
): Promise<PersonalizeCustomerEntryOutput> {
  return personalizeCustomerEntryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedCustomerEntryPrompt',
  input: {schema: PersonalizeCustomerEntryInputSchema},
  output: {schema: PersonalizeCustomerEntryOutputSchema},
  prompt: `You are an AI assistant designed to personalize the customer's experience upon logging in to Ramu Kaka Market.

  Given the following information about the customer, determine the most relevant promotions, product recommendations, and a personalized welcome message.

  Customer ID: {{{customerId}}}
  Customer Name: {{{customerName}}}
  Purchase History: {{{customerPurchaseHistory}}}
  Customer Preferences: {{{customerPreferences}}}

  Consider the customer's past purchases, stated preferences, and current market trends to tailor the experience.

  Provide the output in JSON format.
  `,
});

const personalizeCustomerEntryFlow = ai.defineFlow(
  {
    name: 'personalizeCustomerEntryFlow',
    inputSchema: PersonalizeCustomerEntryInputSchema,
    outputSchema: PersonalizeCustomerEntryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
