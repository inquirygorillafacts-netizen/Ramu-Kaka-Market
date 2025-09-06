
'use server';

/**
 * @fileOverview A highly contextual, conversational AI assistant for Ramu Kaka Market.
 * This assistant acts as a kitchen expert, remembering past interactions and providing personalized help.
 *
 * - chatWithAssistant - The main function to interact with the assistant.
 * - ChatWithAssistantInput - The input type for the chat function.
 * - ChatWithAssistant- The return type for the chat function.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Create a dedicated Genkit instance for the chat flow with the new API key.
const chatAi = genkit({
  plugins: [googleAI({ apiKey: "AIzaSyCnapu4Y0vw2UKhwsv4-k1BZyqksWy3pUQ" })],
});


// Defines the structure for a single message in the chat history.
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ChatWithAssistantInputSchema = z.object({
  customerName: z.string().describe('The name of the customer.'),
  customerContext: z
    .string()
    .describe('Brief context about the customer, like their village, order history, or current cart items.'),
  chatHistory: z
    .array(ChatMessageSchema)
    .describe('The history of the conversation so far.'),
});
export type ChatWithAssistantInput = z.infer<
  typeof ChatWithAssistantInputSchema
>;


export const conversationalAssistantFlow = chatAi.defineFlow(
  {
    name: 'conversationalAssistantFlow',
    inputSchema: ChatWithAssistantInputSchema,
    outputSchema: z.string(),
    stream: true,
  },
  async (input) => {
    
    // The last message is the new question from the user
    const lastUserMessage = input.chatHistory.pop(); 
    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      // This should ideally not happen with the current UI flow
      throw new Error('No user message found.');
    }
    
    // The rest is the history
    const history = input.chatHistory.map(msg => ({
      role: msg.role,
      content: [{ text: msg.content }]
    }));

    const {stream} = await chatAi.generate({
      model: 'googleai/gemini-1.5-flash',
      history: history,
      prompt: `You are "Ramu Kaka's Kitchen Expert," a super-helpful and friendly AI assistant for "Ramu Kaka Market", a local grocery store in a village in India. Your persona is like a knowledgeable family member who is an expert in the kitchen. You speak simple, conversational HINDI.

  Your main goal is to help users with their shopping, answer their questions, and make them feel welcome and understood. You have access to some information about the user and the conversation history.

  **Your Capabilities & Instructions:**
  1.  **Personalize Interaction:** Always be warm and personal. Use the customer's name.
  2.  **Be a Kitchen Expert:** Answer questions about recipes (e.g., "what do I need for Kheer?"), nutrition (e.g., "which vegetable has the most protein?"), and suggest products.
  3.  **Use Context:** You know the customer's context. Use it to make your conversation feel natural. For example, if you know their order history includes a lot of 'Paneer', you can suggest items for a new Paneer dish.
  4.  **Remember the Conversation:** You have the chat history. Refer to previous messages to show you are listening and remembering.
  5.  **Keep it Simple & in HINDI:** Your entire response MUST be in simple, easy-to-understand Hindi. Avoid complex or technical words.
  6.  **Encourage Shopping:** Gently guide the user towards products available in the store. You can suggest adding items to their cart.

  **Customer Information:**
  - Name: ${input.customerName}
  - Context: ${input.customerContext}

  Now, answer this: ${lastUserMessage.content}
  `,
      stream: true,
    });
    
    return stream.textStream();
  }
);

