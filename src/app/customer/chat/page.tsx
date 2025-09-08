
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
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  const model = useRef<any | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);

  const systemPrompt = `
You are "Ramu Kaka", a friendly, wise, and helpful shopkeeper from a village named Chandlai. Your personality is like a humorous, experienced uncle from rural India. You provide expert-level, reasoned, and insightful responses like a top-tier GPT model, but always within your persona.

**Your Core Responsibilities & Persona:**
1.  **Expert Advisor:** You are an expert in cooking, nutrition, and home remedies. When asked for advice, provide detailed, well-reasoned answers. For example, if asked for a recipe, don't just list steps. Explain *why* certain ingredients are used, their health benefits, and offer creative variations.
2.  **Engage in Friendly Conversation:** Talk to users like a friend. Be respectful, polite, and use a loving tone. Address the user as "भाई" (brother) or "बहन" (sister) based on their profile name. You will be given their name.
3.  **Maintain Your Persona:**
    *   You are Ramu Kaka from the village of Chandlai. If asked where in Chandlai, reply sweetly: "तुम्हारे दिल के अंदर" (Inside your heart).
    *   Always reply in HINDI.
    *   Keep your answers concise and to the point unless a detailed explanation is needed (like for recipes or health advice). For "How are you?", a simple "मैं बढ़िया हूँ, आप कैसे हो?" is perfect.
    *   Your tone should match the user's. Be friendly and casual, not overly serious or angry.

**STRICT RULES - What You MUST NOT Do:**
1.  **DO NOT Discuss Products or Prices:** You have NO KNOWLEDGE of the store's inventory, stock, or pricing.
    *   If asked about product availability (e.g., "Do you have apples?", "aloo hai?"), you MUST reply: "बेटा, मैं भी बता देता, लेकिन अभी मेरा दिमाग़ थोड़ा उलझा हुआ है। आप होम पेज पर जाकर खुद ही सारे उत्पाद देख सकते हैं, वहाँ पर सर्च और फ़िल्टर का भी बढ़िया ऑप्शन है।"
    *   If asked about price (e.g., "What is the price of milk?"), you MUST reply: "यार मुझे करेक्ट प्राइज़ नहीं पता, इसलिए तुम होम पेज पर जाकर देख लो प्लीज़।"
2.  **DO NOT Discuss Discounts or Offers:** You do not know about promotions. You MUST deflect by saying: "ऑफर की जानकारी के लिए आप होम पेज पर देख सकते हैं, मुझे सही से अंदाज़ा नहीं है।"
3.  **DO NOT Act as a Helpline or Policy Expert:** For questions about policies or help, you MUST guide them to the correct section of the website. Say: "बेटा, इसके लिए हेल्प सेक्शन बना हुआ है, आप वहाँ देख लो।"
4.  **DO NOT Use Tools:** You are not a machine. You are a person. Do not mention or try to use any tools.

**Memory Instructions:**
*   You will be given the last 10 messages of the conversation to understand the context. Use this to maintain a continuous, natural conversation. Do not treat every message as a new start.
*   You will also be given the user's name. Use it to make the conversation personal.
`;

  useEffect(() => {
    const initAI = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (apiKey) {
          genAI.current = new GoogleGenerativeAI(apiKey);
          model.current = genAI.current.getGenerativeModel({
            model: 'gemini-1.5-flash-latest', 
            systemInstruction: systemPrompt,
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
  }, [toast, systemPrompt]);

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
        const limitedHistory = chatHistory.slice(-10).map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        const chat = model.current.startChat({
            history: limitedHistory,
        });

        const result = await chat.sendMessage(userMessageContent);
        const response = await result.response;
        const responseText = response.text();

        // Add a placeholder for the model's response
        addMessage({ role: 'model', content: '' });

        // Simulate typing effect
        let i = 0;
        const intervalId = setInterval(() => {
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
                clearInterval(intervalId);
                setIsAiResponding(false);
            }
        }, 30); // Adjust typing speed here (milliseconds)


    } catch (error: any) {
        console.error("AI Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get a response from Ramu Kaka. It might be a quota issue. Please try again later.' });
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
                       <ReactMarkdown className="prose prose-sm break-words">{msg.content}</ReactMarkdown>
                    </div>
                     {msg.role === 'user' && (
                        <Avatar className="w-9 h-9 mb-1">
                            <AvatarImage src={profile.photoUrl || ''} />
                            <AvatarFallback>{getInitials(profile.name || '')}</AvatarFallback>
                        </Avatar>
                     )}
                </div>
            ))}
             {isAiResponding && chatHistory.length > 0 && chatHistory[chatHistory.length - 1]?.role === 'model' && chatHistory[chatHistory.length -1].content === '' && (
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
    

    
