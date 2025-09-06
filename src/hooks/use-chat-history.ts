import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/ai/flows/conversational-assistant';

export function useChatHistory(storageKey: string) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(storageKey);
      if (storedHistory) {
        setChatHistory(JSON.parse(storedHistory));
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage", error);
    }
  }, [storageKey]);

  const addMessage = useCallback((message: ChatMessage) => {
    const updatedHistory = [...chatHistory, message];
    setChatHistory(updatedHistory);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save chat history to localStorage", error);
    }
  }, [chatHistory, storageKey]);
  
  const clearHistory = useCallback(() => {
    setChatHistory([]);
    try {
        localStorage.removeItem(storageKey);
    } catch (error) {
        console.error("Failed to clear chat history from localStorage", error);
    }
  }, [storageKey]);


  return { chatHistory, addMessage, clearHistory };
}
