
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserProfile, CartItem, Order } from '@/lib/types';
import { Loader2, Send, BrainCircuit, ArrowLeft, User as UserIcon, Square } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useChatHistory } from '@/hooks/use-chat-history';
import { conversationalAssistantFlow, ChatMessage } from '@/ai/flows/conversational-assistant';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { runFlow } from '@genkit-ai/next/client';


export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { chatHistory, addMessage, updateLastMessage, clearHistory } = useChatHistory('ramukaka_chat_history');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setCurrentUser(user);
            // Load all user data in parallel
            const profilePromise = (async () => {
                const savedProfile = localStorage.getItem('ramukaka_profile');
                return savedProfile ? JSON.parse(savedProfile) : {};
            })();
            const cartPromise = (async () => {
                const savedCart = localStorage.getItem('ramukaka_cart');
                return savedCart ? JSON.parse(savedCart) : [];
            })();
            const lastOrderPromise = (async () => {
                 const q = query(
                    collection(db, 'orders'),
                    where('customerId', '==', user.uid),
                    orderBy('createdAt', 'desc'),
                    limit(1)
                 );
                 const querySnapshot = await getDocs(q);
                 if (!querySnapshot.empty) {
                     return querySnapshot.docs[0].data() as Order;
                 }
                 return null;
            })();

            const [localProfile, cartData, orderData] = await Promise.all([profilePromise, cartPromise, lastOrderPromise]);
            
            setProfile(localProfile);
            setCart(cartData);
            setLastOrder(orderData);

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
  
  const handleStopGeneration = () => {
      if(abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
          setIsAiResponding(false);
          toast({title: "Generation Stopped", description: "Ramuk Kaka has stopped writing."});
      }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiResponding) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    addMessage(userMessage);
    setChatInput('');
    setIsAiResponding(true);

    // Add empty model message for streaming
    addMessage({ role: 'model', content: '' });

    try {
        const lastOrderText = lastOrder ? `Last order was for ${lastOrder.items.map(i => i.name).join(', ')} on ${lastOrder.createdAt.toLocaleDateString()}.` : 'No recent orders.';
        const customerContext = `Current Village: ${profile.village || 'Not provided'}. Current Cart: ${cart.map(i => i.name).join(', ') || 'Empty'}. ${lastOrderText}`;
        
        abortControllerRef.current = new AbortController();
        const stream = runFlow(conversationalAssistantFlow, {
            customerName: profile.name || 'Friend',
            customerContext: customerContext,
            chatHistory: [...chatHistory, userMessage],
        }, { signal: abortControllerRef.current });

        for await (const chunk of stream) {
            updateLastMessage(chunk);
        }

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log("Flow execution was aborted.");
        } else {
            console.error("Chat AI error:", error);
            const errorMessage = 'माफ़ कीजिए, मुझे अभी जवाब देने में कुछ परेशानी हो रही है।';
            updateLastMessage(errorMessage);
        }
    } finally {
        setIsAiResponding(false);
        abortControllerRef.current = null;
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
                            <AvatarImage src={profile.photoUrl} />
                            <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                        </Avatar>
                     )}
                </div>
            ))}
             {isAiResponding && chatHistory[chatHistory.length - 1]?.role === 'model' && chatHistory[chatHistory.length - 1]?.content === '' && (
                <div className="flex justify-start">
                     <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-card text-foreground rounded-bl-none shadow-sm">
                        <Loader2 className="w-5 h-5 animate-spin"/>
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
                    disabled={isAiResponding}
                    className="flex-grow h-11 text-base"
                />
                {isAiResponding ? (
                     <Button type="button" size="icon" variant="destructive" onClick={handleStopGeneration} className="h-11 w-11">
                        <Square className="w-5 h-5"/>
                     </Button>
                ) : (
                    <Button type="submit" size="icon" disabled={!chatInput.trim()} className="h-11 w-11">
                        <Send className="w-5 h-5"/>
                    </Button>
                )}
            </form>
        </footer>
    </div>
  )
}
