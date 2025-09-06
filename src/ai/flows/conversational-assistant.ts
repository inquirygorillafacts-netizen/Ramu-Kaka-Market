
'use server';

/**
 * @fileOverview A simplified, direct conversational AI assistant for Ramu Kaka Market.
 * This assistant uses a dedicated API key to avoid conflicts.
 *
 * - conversationalAssistantFlow - The main function to interact with the assistant.
 * - ChatMessage - The type for a single message in the chat history.
 * - ConversationalAssistantInput - The input type for the chat function.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

// Create a dedicated Genkit instance for the chat flow with the new, dedicated API key.
// This isolates the chat functionality from other AI tasks.
const chatAi = genkit({
  plugins: [googleAI({ apiKey: "AIzaSyCnapu4Y0vw2UKhwsv4-k1BZyqksWy3pUQ" })],
});


// Defines the structure for a single message in the chat history.
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ConversationalAssistantInputSchema = z.object({
  chatHistory: z
    .array(ChatMessageSchema)
    .describe('The history of the conversation so far.'),
});
export type ConversationalAssistantInput = z.infer<
  typeof ConversationalAssistantInputSchema
>;

export const conversationalAssistantFlow = chatAi.defineFlow(
  {
    name: 'conversationalAssistantFlow',
    inputSchema: ConversationalAssistantInputSchema,
    outputSchema: z.string(),
    stream: true,
  },
  async (input) => {
    
    // The history is mapped to the format expected by the Gemini model.
    const history = input.chatHistory.map(msg => ({
      role: msg.role,
      content: [{ text: msg.content }]
    }));

    // The user's last message is the prompt.
    const lastUserMessage = history.pop();

    const {stream, response} = chatAi.generate({
      model: 'googleai/gemini-1.5-flash',
      history: history,
      prompt: lastUserMessage?.content[0].text || '',
      stream: true,
    });
    
    // The flow directly returns the text stream to the client.
    return stream.textStream();
  }
);
