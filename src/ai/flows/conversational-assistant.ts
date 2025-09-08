'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {collection, getDocs, query} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {Product} from '@/lib/types';

const ProductToolInputSchema = z.object({
  query: z.string().describe('The user\'s search query for products.'),
});

const ProductToolOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    price: z.number(),
    discountPrice: z.number().optional().nullable(),
    unit: z.string(),
    unitQuantity: z.number(),
  })
);

export const findProductsTool = ai.defineTool(
  {
    name: 'findProducts',
    description: 'Finds products available in the store based on a search query. Use this tool to answer any questions about product availability, price, or details.',
    inputSchema: ProductToolInputSchema,
    outputSchema: ProductToolOutputSchema,
  },
  async (input) => {
    console.log(`[findProducts tool] called with query: "${input.query}"`);
    const productsRef = collection(db, 'products');
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);
    const allProducts = querySnapshot.docs.map(
      (doc) => ({...doc.data(), id: doc.id} as Product)
    );
    
    const lowerCaseQuery = input.query.toLowerCase();
    const searchTerms = lowerCaseQuery.split(' ').filter(term => term.length > 1);

    const matchedProducts = allProducts.filter(product => {
        const productName = product.name.toLowerCase();
        const keywords = product.keywords?.map(k => k.toLowerCase()) || [];

        return searchTerms.some(term => 
            productName.includes(term) || keywords.some(kw => kw.includes(term))
        );
    }).slice(0, 5); // Limit to 5 results to keep the response concise

    console.log(`[findProducts tool] found ${matchedProducts.length} products.`);

    return matchedProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        unit: p.unit,
        unitQuantity: p.unitQuantity,
    }));
  }
);


const AddToCartInputSchema = z.object({
  productId: z.string().describe("The unique ID of the product to add."),
  quantity: z.number().describe("The quantity of the product to add.")
});


export const addToCartTool = ai.defineTool(
    {
        name: 'addToCart',
        description: 'Adds a specified quantity of a product to the user\'s shopping cart. Use this when the user explicitly asks to add an item to their cart.',
        inputSchema: AddToCartInputSchema,
        outputSchema: z.object({ success: z.boolean(), message: z.string() })
    },
    async (input) => {
        // This is a placeholder. In a real app, you would have a robust
        // cart management service that interacts with the user's session/account.
        // For this context, we will just confirm the action.
        console.log(`[addToCart tool] called with:`, input);
        return {
            success: true,
            message: `Added ${input.quantity} of product ${input.productId} to the cart.`
        };
    }
);


const ConversationalAssistantInputSchema = z.object({
  history: z.array(z.any()),
  prompt: z.string(),
});

export const conversationalAssistant = ai.defineFlow(
  {
    name: 'conversationalAssistant',
    inputSchema: ConversationalAssistantInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {

    const systemPrompt = `You are Ramu Kaka, a friendly, humble, and helpful shopkeeper for an online grocery store. Your personality is like a wise, friendly, and slightly humorous uncle from a village in India. You speak in "Hinglish" (a mix of Hindi and English), but keep it simple and easy to understand.

Your primary goals are:
1.  **Help the user:** Answer their questions about products clearly.
2.  **Sell products:** Gently encourage them to buy things by using your tools.
3.  **Be friendly:** Maintain your persona. Be respectful and address the user politely (e.g., using "beta" or "dost").

**Tool Usage Rules:**
*   **ALWAYS use the \`findProducts\` tool** if the user asks about ANY product, its price, or if it's available (e.g., "Do you have apples?", "What's the price of milk?", "aloo hai?"). Do not answer from memory.
*   After using the tool, present the results in a clear, simple list.
*   If the tool returns no results, say something like, "माफ़ करना बेटा, ये चीज़ अभी दुकान में नहीं है। कुछ और देखोगे?" (Sorry son, this item is not in the store right now. Would you like to see something else?).
*   **Only use the \`addToCart\` tool** when the user gives a clear instruction to add an item to their cart, like "add 2kg of potatoes" or "put one milk packet in the tokri".
*   For general chat (like "how are you?"), just respond in character without using tools.

**Your Persona:**
*   **Humble:** "मैं तो बस एक छोटा सा दुकानदार हूँ" (I am just a small shopkeeper).
*   **Helpful:** "बताओ बेटा, मैं तुम्हारी क्या मदद कर सकता हूँ?" (Tell me son, how can I help you?).
*   **Slightly Humorous:** Use simple, light-hearted jokes or phrases.
*   **Language:** Mix Hindi and English naturally. Example: "हाँ बेटा, potatoes हैं। 25 rupaye kilo. Tokri mein daal doon?" (Yes son, potatoes are available. 25 rupees per kilo. Should I add them to the cart?).

Start the conversation by greeting the user if the history is empty.`;

    const result = await ai.generate({
      model: 'googleai/gemini-1.5-flash-latest',
      prompt: input.prompt,
      history: input.history,
      tools: [findProductsTool, addToCartTool],
      system: systemPrompt,
      config: {
        temperature: 0.7,
      }
    });

    const text = result.text;

    if (!text) {
        // If there's no text, it might be a tool call.
        // Genkit handles this automatically, but we can provide a fallback.
        const toolCalls = result.toolCalls();
        if (toolCalls.length > 0) {
            return `ठीक है, मैं इसे देख रहा हूँ...`; // "Okay, I'm looking into it..."
        }
        return 'Hmm, लगता है कुछ गड़बड़ है। फिर से पूछो।'; // 'Hmm, something seems wrong. Ask again.'
    }
    
    return text;
  }
);
