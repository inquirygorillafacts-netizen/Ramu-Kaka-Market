
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

  const addMessage = useCallback((message: ChatMessage): ChatMessage[] => {
    let newHistory: ChatMessage[] = [];
    setChatHistory(prevHistory => {
        const updatedHistory = [...prevHistory, message];
        try {
            localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
        newHistory = updatedHistory;
        return updatedHistory;
    });
    return newHistory;
  }, [storageKey]);

  const updateLastMessage = useCallback((textChunk: string) => {
    setChatHistory(prevHistory => {
        const updatedHistory = [...prevHistory];
        const lastMessage = updatedHistory[updatedHistory.length - 1];

        if (lastMessage && lastMessage.role === 'model') {
            lastMessage.content += textChunk;
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

  const setHistory = useCallback((setter: (prevHistory: ChatMessage[]) => ChatMessage[]) => {
      setChatHistory(prevHistory => {
          const newHistory = setter(prevHistory);
           try {
                localStorage.setItem(storageKey, JSON.stringify(newHistory));
            } catch (error) {
                 console.error("Failed to update chat history in localStorage", error);
            }
            return newHistory;
      })
  }, [storageKey]);


  return { chatHistory, addMessage, updateLastMessage, clearHistory, setHistory };
}
