
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

  const setHistory = useCallback((newHistory: ChatMessage[] | ((prevState: ChatMessage[]) => ChatMessage[])) => {
    const updatedHistory = typeof newHistory === 'function' ? newHistory(chatHistory) : newHistory;
    setChatHistory(updatedHistory);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save chat history to localStorage", error);
    }
  }, [storageKey, chatHistory]);


  return { chatHistory, setHistory };
}
