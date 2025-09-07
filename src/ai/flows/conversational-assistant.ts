
'use server';

/**
 * @fileOverview A simplified, direct conversational AI assistant for Ramu Kaka Market.
 *
 * THIS FLOW IS DEPRECATED AND SHOULD NOT BE USED.
 * The logic has been moved to the client-side in `src/app/customer/chat/page.tsx`
 * as per the user's request. This file is kept for historical purposes but will be removed.
 *
 * - conversationalAssistant - The main function to interact with the assistant.
 * - ChatMessage - The type for a single message in the chat history.
 * - ConversationalAssistantInput - The input type for the chat function.
 */

import { z } from 'zod';
import { UserProfile } from '@/lib/types';


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
   userProfile: z.custom<Partial<UserProfile>>().optional().describe('The user profile of the current user'),
});
export type ConversationalAssistantInput = z.infer<
  typeof ConversationalAssistantInputSchema
>;

export async function conversationalAssistant(input: ConversationalAssistantInput): Promise<ReadableStream<string>> {
    // This is a deprecated flow.
    throw new Error("This AI flow is deprecated and should not be called.");
}
