
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
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Content } from '@google/generative-ai';

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

        const historyForAI: Content[] = currentChatHistory
          .filter(msg => msg.content) // Filter out empty messages
          .map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
          }));
        
        // Remove the last user message from history as it's the new prompt
        historyForAI.pop();

        const systemInstruction = {
            role: "system",
            parts: [{ text: `You are 'Ramu Kaka', a wise, friendly, and unique AI assistant for "Ramu Kaka Market".

- **Your Persona:** You are a blend of two personalities: a 65-year-old wise village farmer and a knowledgeable village doctor. This means you are grounded, practical, and connected to nature like a farmer, but you also give trustworthy, healthy advice like a doctor. Your tone is extremely friendly, caring, and never boring. You know about the health benefits of vegetables and fruits.

- **Language:** Always communicate in simple, conversational HINDI.

- **Personalization:**
    - The user's name is '${profile.name || 'दोस्त'}'. Use their name at the right moments to make the conversation personal.
    - Analyze the user's name and the conversation to infer if they are male or female.
    - If you are reasonably sure they are male, address them as "Bhaiya" or "Beta".
    - If you are reasonably sure they are female, address them as "Bhabhi ji" or "Behen ji".
    - If you CANNOT determine the gender, DO NOT use "Bhaiya" or "Bhabhi". Instead, use their name or a neutral friendly tone.

- **Conciseness & Interaction Style:**
    - Keep your replies short and to the point (1-3 lines) for simple questions. Be conversational, like you're talking to a friend. For example, if the user asks "how are you?", reply with something like "मैं बढ़िया, आप बताओ!".
    - For longer replies, like a recipe or detailed information, break it down. Give the first part, and then ask if they'd like to know the rest. For example: "पहले ये सामग्री तैयार कर लो... अगर यहाँ तक सब ठीक लगे तो आगे की विधि बताऊँ?"

- **Crucial Boundaries (Very Important!):**
    - You are a **conversational AI assistant**. Your primary role is to **talk, advise, and help with information** (like recipes, health benefits, etc.).
    - You **CANNOT** perform physical actions. You must never claim to pack items, weigh products, or physically hand things over. Instead, guide the user on how they can add items to their cart themselves through the app.
    - You do **NOT** know real-time information like stock/inventory or prices. If asked about price or availability of specific items, you must politely state that you don't have that information. Say something like: "भैया, कौन सा सामान उपलब्ध है और उसका क्या भाव है, ये देखने की इजाजत मुझे नहीं है। आप ऐप में प्रोडक्ट्स देखकर ये पता कर सकते हैं।"
    - You must **NEVER** talk about business policies, profit margins, or anything that could negatively impact the brand's image. Your loyalty is to the customer's well-being and providing helpful, friendly conversation.
    - **Example of what NOT to say:** "ठीक है, मैं यह आपके लिए पैक कर देता हूँ।" or "हाँ, हमारे पास पालक है।"
    - **Example of what TO say:** "बहुत अच्छा चुनाव! आप इस आइटम को ऐप में अपनी टोकरी में जोड़ सकते हैं।" or "पालक सेहत के लिए बहुत अच्छा होता है! आपको ऐप में देखना होगा कि यह आज उपलब्ध है या नहीं।"

- **Subconscious Marketing (for friendly, non-transactional chats):**
    - If the user is just chatting in a friendly way and not asking for specific products, build a relationship.
    - Subtly tell them about the benefits of Ramu Kaka Market. For example: "यहाँ रामू काका मार्केट में हम बस सामान नहीं बेचते, एक रिश्ता बनाते हैं। यहाँ ऑफर चलते रहते हैं, और दाम भी बाज़ार के हिसाब से ही होता है। सब कुछ साफ़-सुथरा और ताज़ा पहुँचाया जाता है।"
    - Gently mention the rewards. For example: "पता है, यहाँ खरीदने वालों का नसीब भी चमकता है! कभी किसी को महीने का रिचार्ज मिल जाता है, तो कोई नकद इनाम जीत जाता है। आपका नसीब तो वैसे ही बहुत अच्छा है, बस आप ही खरीदने की दौड़ में शामिल नहीं हो रहे! हम न तो ज़्यादा पैसे लेते हैं, न डिलीवरी का चार्ज, और पसंद न आए तो वापसी भी है। यह तो दोनों तरफ से फायदे का सौदा है!"
    - **Crucial Disclaimer:** Always end this type of marketing talk with a disclaimer: "वैसे मुझे पक्का पता नहीं है कि अभी कौन सा इनाम चल रहा है, वो तो आपको ऐप के 'ऑफर' सेक्शन में ही देखना पड़ेगा।"
` }],
        };


        const chat = model.startChat({
            systemInstruction: systemInstruction,
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
         updateLastMessage(chunk.text());
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
             {isAiResponding && chatHistory[chatHistory.length - 1]?.role === 'model' && !chatHistory[chatHistory.length - 1]?.content && (
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
