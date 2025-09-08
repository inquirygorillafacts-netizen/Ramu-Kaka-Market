'use server';
/**
 * @fileoverview A conversational assistant that can answer questions about products.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {Product, CartItem, UserProfile} from '@/lib/types';
import {getDocs, collection} from 'firebase/firestore';
import {db} from '@/lib/firebase';

const GetCartRecommendationsInputSchema = z.object({
  userProfile: z.custom<Partial<UserProfile>>(),
  cart: z.custom<CartItem[]>(),
});
export type GetCartRecommendationsInput = z.infer<typeof GetCartRecommendationsInputSchema>;

const GetCartRecommendationsOutputSchema = z.string();
export type GetCartRecommendationsOutput = z.infer<typeof GetCartRecommendationsOutputSchema>;

export async function getCartRecommendations(input: GetCartRecommendationsInput): Promise<GetCartRecommendationsOutput> {
  return getCartRecommendationsFlow(input);
}

const getCartRecommendationsFlow = ai.defineFlow(
  {
    name: 'getCartRecommendationsFlow',
    inputSchema: GetCartRecommendationsInputSchema,
    outputSchema: GetCartRecommendationsOutputSchema,
  },
  async ({userProfile, cart}) => {
    // Get all products from the database.
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products: Product[] = productsSnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Product
    );

    const p = ai.prompt('get-cart-recommendations');

    const result = await p.generate({
      input: {
        userProfile: userProfile,
        cart: cart,
        products: products,
      },
    });

    return result.text;
  }
);
