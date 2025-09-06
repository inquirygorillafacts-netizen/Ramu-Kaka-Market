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

  const updateLastMessage = useCallback((chunk: string) => {
    setChatHistory(prevHistory => {
        const updatedHistory = [...prevHistory];
        const lastMessage = updatedHistory[updatedHistory.length - 1];

        if (lastMessage && lastMessage.role === 'model') {
            lastMessage.content += chunk;
            try {
                localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
            } catch (error) {
                 console.error("Failed to update chat history in localStorage", error);
            }
        }
        return updatedHistory;
    });
  }, [storageKey]);
  
  const clearHistory = useCallback(() => {
    setChatHistory([]);
    try {
        localStorage.removeItem(storageKey);
    } catch (error) {
        console.error("Failed to clear chat history from localStorage", error);
    }
  }, [storageKey]);


  return { chatHistory, addMessage, updateLastMessage, clearHistory };
}
