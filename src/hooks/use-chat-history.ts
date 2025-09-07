
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
        setChatHistory([{ role: 'model', content: 'स्माइल प्लीज 😄' }]);
      }
    } catch (error) {
      console.error("Failed to load chat history from localStorage", error);
      setChatHistory([{ role: 'model', content: 'स्माइल प्लीज 😄' }]);
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
    setChatHistory(prevHistory => {
        const updatedHistory = [...prevHistory, message];
        try {
            localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
        return updatedHistory;
    });
  }, [storageKey]);


  return { chatHistory, addMessage, setHistory };
}
