'use server';

/**
 * @fileOverview A highly contextual, conversational AI assistant for Ramu Kaka Market.
 * This assistant acts as a kitchen expert, remembering past interactions and providing personalized help.
 *
 * - chatWithAssistant - The main function to interact with the assistant.
 * - ChatWithAssistantInput - The input type for the chat function.
 * - ChatWithAssistantOutput - The return type for the chat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
  question: z
    .string()
    .describe('The latest question or message from the customer.'),
});
export type ChatWithAssistantInput = z.infer<
  typeof ChatWithAssistantInputSchema
>;

const ChatWithAssistantOutputSchema = z.object({
  answer: z.string().describe('The AI\'s response in simple, conversational Hindi.'),
});
export type ChatWithAssistantOutput = z.infer<
  typeof ChatWithAssistantOutputSchema
>;

export async function chatWithAssistant(
  input: ChatWithAssistantInput
): Promise<ChatWithAssistantOutput> {
  return conversationalAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'conversationalAssistantPrompt',
  input: {schema: ChatWithAssistantInputSchema},
  output: {schema: ChatWithAssistantOutputSchema},
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
  - Name: {{{customerName}}}
  - Context: {{{customerContext}}}

  **Conversation History:**
  {{#each chatHistory}}
    - **{{role}}**: {{content}}
  {{/each}}

  **New Question from Customer:**
  - **user**: {{{question}}}

  Based on all this information, provide a helpful and friendly response in HINDI.
  `,
});

const conversationalAssistantFlow = ai.defineFlow(
  {
    name: 'conversationalAssistantFlow',
    inputSchema: ChatWithAssistantInputSchema,
    outputSchema: ChatWithAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
