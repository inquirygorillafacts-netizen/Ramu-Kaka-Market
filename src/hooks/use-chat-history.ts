
import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/lib/types';

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

  const setHistory = useCallback((newHistory: ChatMessage[]) => {
    setChatHistory(newHistory);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save chat history to localStorage", error);
    }
  }, [storageKey]);

  const addMessage = useCallback((message: ChatMessage) => {
    setHistory([...chatHistory, message]);
  }, [chatHistory, setHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);


  return { chatHistory, addMessage, clearHistory, setHistory };
}

    