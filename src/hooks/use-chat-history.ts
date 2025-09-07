
import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/lib/types';

export function useChatHistory(storageKey: string) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(storageKey);
      if (storedHistory) {
        setChatHistory(JSON.parse(storedHistory));
      } else {
        setChatHistory([]); // Start with an empty history
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage", error);
      setChatHistory([]);
    }
  }, [storageKey]);

  const setHistory = useCallback((newHistory: ChatMessage[]) => {
    try {
      setChatHistory(newHistory);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save chat history to localStorage", error);
    }
  }, [storageKey]);

  const addMessage = useCallback((message: ChatMessage) => {
    // Use a functional update to ensure we're always working with the latest state
    setChatHistory(prevHistory => {
        const updatedHistory = [...prevHistory, message];
        try {
            localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
        } catch (error) {
            // If storing fails, we don't want to crash the app, but log the error
            console.error("Failed to save chat history to localStorage", error);
        }
        return updatedHistory;
    });
  }, [storageKey]);


  return { chatHistory, addMessage, setHistory };
}
