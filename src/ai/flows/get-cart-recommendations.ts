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

export const getCartRecommendations = ai.defineFlow(
  {
    name: 'getCartRecommendations',
    inputSchema: GetCartRecommendationsInputSchema,
    outputSchema: z.string(),
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
