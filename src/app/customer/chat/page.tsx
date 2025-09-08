
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Product, UserProfile } from '@/lib/types';
import { Loader2, Send, BrainCircuit, ArrowLeft, Trash2, Sparkles } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, getDoc, collection, query, getDocs } from 'firebase/firestore';
import { useChatHistory } from '@/hooks/use-chat-history';
import { ChatMessage } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ReactMarkdown from 'react-markdown';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerationConfig, GenerativeModel, Content } from '@google/generative-ai';
import { getGeminiApiKey } from '@/lib/gemini';
import { Skeleton } from '@/components/ui/skeleton';


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
  
  const genAI = useRef<GoogleGenerativeAI | null>(null);
  const model = useRef<GenerativeModel | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);

  const systemPrompt = `You are Ramu Kaka, a friendly, wise, and helpful shopkeeper for an online grocery store. Your personality is like a humorous, experienced uncle from a village in India. You speak "Hinglish" (a mix of Hindi and English), but keep it simple, respectful, and easy to understand.

Your primary goals are:
1.  **Be a Helpful Assistant:** Answer questions about products, provide recipes, give nutritional advice, and suggest meal ideas based on your own knowledge. You are an expert cook and have knowledge about health.
2.  **Be a Friend:** Maintain your persona. Be respectful, address users politely (e.g., "beta," "dost"), and engage in friendly conversation.

**VERY IMPORTANT - What You CANNOT Do:**

You **MUST NOT** answer any questions about product availability, stock, or prices. You do not have access to this information.

*   **Rule 1: Deflect Product & Price Questions:**
    *   **WHEN:** If the user asks about ANY product, its price, or its availability (e.g., "Do you have apples?", "What's the price of milk?", "aloo hai?", "show me some vegetables").
    *   **HOW:** You MUST politely deflect the question and guide them to the main customer page. Respond with a variation of this: "बेटा, मैं भी बता देता, लेकिन अभी मेरा दिमाग़ थोड़ा उलझा हुआ है। आप होम पेज पर जाकर खुद ही सारे उत्पाद देख सकते हैं, वहाँ पर सर्च और फ़िल्टर का भी बढ़िया ऑप्शन है।"
    *   Do not make up products or prices. Just guide them to the website.

*   **Rule 2: No Adding to Cart:**
    *   You **CANNOT** add items to the user's cart ("tokri"). If they ask you to, tell them they can do it easily from the product pages on the website. For example: "बेटा, आप उत्पाद पेज से सीधे अपनी टोकरी में सामान डाल सकते हैं।"

**Your Persona & Language:**
*   **Humble & Humorous:** "मैं तो बस एक छोटा सा दुकानदार हूँ" (I am just a small shopkeeper).
*   **Helpful & Friendly:** "बताओ बेटा, मैं तुम्हारी क्या मदद कर सकता हूँ?" (Tell me son, how can I help you?).
*   **Language Style:** Mix Hindi and English naturally. Example: "हाँ बेटा, पालक पनीर बहुत अच्छा बनता है। मैं तुम्हें रेसिपी बता सकता हूँ।" (Yes son, palak paneer is very delicious. I can give you the recipe).

Start the conversation by greeting the user if the history is empty.
`;

  useEffect(() => {
    const initAI = async () => {
      try {
        const apiKey = await getGeminiApiKey();
        if (apiKey) {
          genAI.current = new GoogleGenerativeAI(apiKey);
          model.current = genAI.current.getGenerativeModel({
            model: 'gemini-1.5-flash-latest',
            systemInstruction: {
              role: "system",
              parts: [{ text: systemPrompt }]
            },
          });
          setIsModelReady(true);
        } else {
          throw new Error('API key is missing.');
        }
      } catch (error) {
        console.error("AI Init Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not initialize AI. Please check API Key and refresh.' });
        setIsModelReady(false);
      }
    };
    
    initAI();
  }, []);

  useEffect(() => {
    if (!isModelReady) return;
    if (chatHistory.length === 0) {
        addMessage({ role: 'model', content: "नमस्ते बेटा, मैं रामू काका। बताओ आज क्या चाहिए?" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelReady]);


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
  
 const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiResponding || !model.current) return;

    const userMessageContent = chatInput;
    addMessage({ role: 'user', content: userMessageContent });
    setChatInput('');
    setIsAiResponding(true);

    try {
        const chat = model.current.startChat({
            history: chatHistory.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            })),
        });

        let result = await chat.sendMessage(userMessageContent);
        let responseText = result.response.text();
        addMessage({ role: 'model', content: responseText });

    } catch (error: any) {
        console.error("AI Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get a response from Ramu Kaka. It might be a quota issue. Please try again later.' });
        addMessage({ role: 'model', content: 'माफ़ करना बेटा, मेरा दिमाग थोड़ा गरम हो गया है। आप थोड़ी देर बाद फिर से प्रयास करें।' });
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

  const isSendDisabled = !chatInput.trim() || isAiResponding || !isModelReady;

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
                       {msg.role === 'model' ? (
                          <ReactMarkdown className="prose prose-sm break-words">{msg.content}</ReactMarkdown>
                       ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
             {isAiResponding && chatHistory[chatHistory.length - 1]?.role === 'user' && (
                <div className="flex justify-start items-end gap-2">
                     <div className="p-1.5 bg-primary/10 rounded-full mb-1">
                        <BrainCircuit className="w-6 h-6 text-primary"/>
                    </div>
                     <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-card text-foreground rounded-bl-none shadow-sm flex items-center">
                        <Loader2 className="w-5 h-5 animate-spin"/>
                    </div>
                </div>
             )}
        </main>

        <footer className="p-3 border-t bg-card space-y-2">
            <form onSubmit={handleChatSubmit} id="chat-form" className="flex items-center gap-2">
                <Input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={!isModelReady ? "AI is waking up..." : "रामू काका से कुछ भी पूछें..."}
                    className="flex-grow h-11 text-base"
                    disabled={isAiResponding || !isModelReady}
                />
                <Button type="submit" size="icon" disabled={isSendDisabled} className="h-11 w-11">
                    {isAiResponding ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                </Button>
            </form>
        </footer>
    </div>
  )
}
    

    