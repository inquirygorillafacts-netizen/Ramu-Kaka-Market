'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';
import { Loader2, Send, BrainCircuit, ArrowLeft, Trash2, Square } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, getDoc } from 'firebase/firestore';
import { useChatHistory } from '@/hooks/use-chat-history';
import { ChatMessage } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ReactMarkdown from 'react-markdown';
import { askRamuKaka } from '@/ai/genkit';


export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { chatHistory, addMessage, setHistory } = useChatHistory('ramukaka_chat_history');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (chatHistory.length === 0) {
        addMessage({ role: 'model', content: "नमस्ते बेटा, मैं रामू काका। बताओ आज क्या चाहिए?" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [chatHistory]);

  const getInitials = (name: string = "") => name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  const handleClearChat = () => {
    setHistory([]);
    addMessage({ role: 'model', content: "नमस्ते बेटा, मैं रामू काका। बताओ आज क्या चाहिए?" });
  };
  
  const stopResponding = () => {
    if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
    }
    setIsAiResponding(false);
  }
  
  const handleActionClick = (e: React.FormEvent) => {
    e.preventDefault();
    if(isAiResponding) {
        stopResponding();
    } else {
        handleChatSubmit();
    }
  }
  
  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isAiResponding) return;

    const userMessageContent = chatInput;
    addMessage({ role: 'user', content: userMessageContent });
    setChatInput('');
    setIsAiResponding(true);
    addMessage({ role: 'model', content: '...' }); // Placeholder for AI response

    try {
        const limitedHistory = chatHistory.slice(-10);

        const responseText = await askRamuKaka({
            chatHistory: limitedHistory,
            userMessage: userMessageContent,
            userName: profile.name
        });

        setHistory(prev => {
            const newHistory = [...prev];
            const lastMessage = newHistory[newHistory.length - 1];
            if (lastMessage && lastMessage.role === 'model') {
                lastMessage.content = ''; // Clear placeholder
            }
            return newHistory;
        });

        let i = 0;
        typingIntervalRef.current = setInterval(() => {
            if (i < responseText.length) {
                setHistory(prev => {
                    const newHistory = [...prev];
                    const lastMessage = newHistory[newHistory.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        lastMessage.content += responseText[i];
                    }
                    return newHistory;
                });
                i++;
            } else {
               stopResponding();
            }
        }, 30);


    } catch (error: any) {
        console.error("AI Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get a response from Ramu Kaka. It might be a quota issue. Please try again later.' });
        setHistory(prev => prev.slice(0, -1)); // Remove the placeholder
        addMessage({ role: 'model', content: 'माफ़ करना बेटा, मेरा दिमाग थोड़ा गरम हो गया है। आप थोड़ी देर बाद फिर से प्रयास करें।' });
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

  const isSendDisabled = !chatInput.trim();

  return (
    <div className="flex flex-col h-screen bg-muted/30">
        <header className="flex items-center justify-between gap-4 p-3 border-b bg-card shadow-sm">
            <div className='flex items-center gap-2'>
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
            </div>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Chat History?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your conversation with Ramu Kaka from this device. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearChat} className="bg-destructive hover:bg-destructive/90">Clear</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
                       {msg.content === '...' ? (
                         <div className="flex items-center gap-1.5">
                           <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                           <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                           <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                         </div>
                       ) : (
                         <ReactMarkdown className="prose prose-sm break-words">{msg.content}</ReactMarkdown>
                       )}
                    </div>
                     {msg.role === 'user' && (
                        <Avatar className="w-9 h-9 mb-1">
                            <AvatarImage src={profile.photoUrl || ''} />
                            <AvatarFallback>{getInitials(profile.name || '')}</AvatarFallback>
                        </Avatar>
                     )}
                </div>
            ))}
        </main>

        <footer className="p-3 border-t bg-card space-y-2">
            <form onSubmit={handleActionClick} id="chat-form" className="flex items-center gap-2">
                <Input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={"रामू काका से कुछ भी पूछें..."}
                    className="flex-grow h-11 text-base"
                    disabled={isAiResponding}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleActionClick(e);
                        }
                    }}
                />
                <Button type="submit" size="icon" disabled={isSendDisabled && !isAiResponding} className="h-11 w-11">
                    {isAiResponding ? <Square className="w-5 h-5"/> : <Send className="w-5 h-5"/>}
                </Button>
            </form>
        </footer>
    </div>
  )
}
