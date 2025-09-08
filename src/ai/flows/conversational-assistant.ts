'use server';
/**
 * @fileoverview A conversational assistant that can answer questions about products.
 */
import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {Product} from '@/lib/types';
import {collection, getDocs} from 'firebase/firestore';
import {db} from '@/lib/firebase';

const ConversationalAssistantInputSchema = z.object({
  history: z.array(z.any()),
  prompt: z.string(),
});

export type ConversationalAssistantInput = z.infer<typeof ConversationalAssistantInputSchema>;

const ConversationalAssistantOutputSchema = z.string();
export type ConversationalAssistantOutput = z.infer<typeof ConversationalAssistantOutputSchema>;

export async function conversationalAssistant(input: ConversationalAssistantInput): Promise<ConversationalAssistantOutput> {
  return conversationalAssistantFlow(input);
}


const conversationalAssistantFlow = ai.defineFlow(
  {
    name: 'conversationalAssistantFlow',
    inputSchema: ConversationalAssistantInputSchema,
    outputSchema: z.string(),
  },
  async ({history, prompt: userPrompt}) => {
    // Get all products from the database.
    const productsSnapshot = await getDocs(collection(db, 'products'));
    const products: Product[] = productsSnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Product
    );

    const p = ai.prompt('conversational-assistant');

    const result = await p.generate({
      input: {
        history: history,
        prompt: userPrompt,
        products: products,
      },
    });

    return result.text;
  }
);
