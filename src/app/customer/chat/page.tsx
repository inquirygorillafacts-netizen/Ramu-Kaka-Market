
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';
import { Loader2, Send, BrainCircuit, ArrowLeft } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useChatHistory } from '@/hooks/use-chat-history';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, getDoc } from 'firebase/firestore';
import { ChatMessage } from '@/ai/flows/conversational-assistant';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const API_KEY = "AIzaSyCnapu4Y0vw2UKhwsv4-k1BZyqksWy3pUQ";

export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { chatHistory, addMessage, updateLastMessage, setHistory } = useChatHistory('ramukaka_chat_history');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setCurrentUser(user);
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
            }
        } else {
            router.push('/auth');
        }
        setLoading(false);
    });

    return () => unsubscribe();
  },[router])

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isAiResponding]);

  const getInitials = (name: string = "") => name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiResponding) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    addMessage(userMessage);
    const currentChatHistory = [...chatHistory, userMessage];
    const userPrompt = chatInput;
    setChatInput('');
    setIsAiResponding(true);
    addMessage({ role: 'model', content: '' });

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const historyForAI = currentChatHistory
          .filter(msg => msg.content) // Filter out empty messages
          .map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
          }));
        
        // Remove the last user message from history as it's the new prompt
        historyForAI.pop();

        const chat = model.startChat({
            history: historyForAI,
            generationConfig: {
                maxOutputTokens: 2000,
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ]
        });

       const result = await chat.sendMessageStream(userPrompt);
       for await (const chunk of result.stream) {
         const chunkText = chunk.text();
         updateLastMessage(chunkText);
       }

    } catch (error: any) {
        console.error("AI Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get a response from Ramu Kaka. Please try again.' });
        // remove the empty model message and the user's message on error
        setHistory(prev => prev.slice(0, prev.length - 2));
    } finally {
        setIsAiResponding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-muted/30">
        <header className="flex items-center gap-4 p-3 border-b bg-card shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft/>
            </Button>
            <div className="p-1.5 bg-primary/10 rounded-full">
                <BrainCircuit className="w-7 h-7 text-primary"/>
            </div>
            <div>
                <h1 className="text-xl font-bold font-headline text-primary">रामू काका</h1>
                <p className="text-xs text-green-600 font-semibold flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online
                </p>
            </div>
        </header>

        <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
            {chatHistory.map((msg, index) => (
                <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                         <div className="p-1.5 bg-primary/10 rounded-full mb-1">
                            <BrainCircuit className="w-6 h-6 text-primary"/>
                        </div>
                    )}
                    <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card text-foreground rounded-bl-none'}`}>
                       <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                     {msg.role === 'user' && (
                        <Avatar className="w-9 h-9 mb-1">
                            <AvatarImage src={profile.photoUrl || ''} />
                            <AvatarFallback>{getInitials(profile.name || '')}</AvatarFallback>
                        </Avatar>
                     )}
                </div>
            ))}
             {isAiResponding && chatHistory[chatHistory.length - 1]?.role === 'model' && (
                <div className="flex justify-start items-end gap-2">
                     <div className="p-1.5 bg-primary/10 rounded-full mb-1">
                        <BrainCircuit className="w-6 h-6 text-primary"/>
                    </div>
                     <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-card text-foreground rounded-bl-none shadow-sm flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin mr-2"/>
                        <span className="text-sm text-muted-foreground">...</span>
                    </div>
                </div>
             )}
        </main>

        <footer className="p-3 border-t bg-card">
            <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                <Input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="रामू काका से कुछ भी पूछें..."
                    className="flex-grow h-11 text-base"
                    disabled={isAiResponding}
                />
                <Button type="submit" size="icon" disabled={!chatInput.trim() || isAiResponding} className="h-11 w-11">
                    {isAiResponding ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                </Button>
            </form>
        </footer>
    </div>
  )
}
