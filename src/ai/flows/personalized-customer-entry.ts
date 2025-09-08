'use server';
/**
 * @fileoverview A conversational assistant that can answer questions about products.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {Product, UserProfile} from '@/lib/types';

const PersonalizedCustomerEntryInputSchema = z.object({
  userProfile: z.custom<UserProfile>(),
  products: z.custom<Product[]>(),
});

export const personalizedCustomerEntry = ai.defineFlow(
  {
    name: 'personalizedCustomerEntry',
    inputSchema: PersonalizedCustomerEntryInputSchema,
    outputSchema: z.string(),
  },
  async ({userProfile, products}) => {
    const p = ai.prompt('personalized-customer-entry');

    const result = await p.generate({
      input: {
        userProfile: userProfile,
        products: products,
      },
    });

    return result.text;
  }
);
