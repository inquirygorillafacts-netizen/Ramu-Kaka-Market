
import { useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '@/lib/types';

const MAX_HISTORY_LENGTH = 20; // 10 user messages + 10 model responses

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

  const setHistory = useCallback((newHistory: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    const updatedHistory = typeof newHistory === 'function' ? newHistory(chatHistory) : newHistory;
    
    setChatHistory(updatedHistory);
    try {
        localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
    } catch (error) {
        console.error("Failed to save updated chat history to localStorage", error);
    }
  }, [storageKey, chatHistory]);

  const addMessage = useCallback((message: ChatMessage) => {
    setChatHistory(prevHistory => {
        let updatedHistory = [...prevHistory, message];
        
        // Prune the history if it exceeds the max length
        if (updatedHistory.length > MAX_HISTORY_LENGTH) {
            updatedHistory = updatedHistory.slice(updatedHistory.length - MAX_HISTORY_LENGTH);
        }

        try {
            localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
        } catch (error) {
            console.error("Failed to save new message to localStorage", error);
        }
        return updatedHistory;
    });
  }, [storageKey]);


  return { chatHistory, addMessage, setHistory };
}
