'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserProfile } from '@/lib/types';
import { Loader2, Send, BrainCircuit, ArrowLeft, Trash2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, getDoc } from 'firebase/firestore';
import { useChatHistory } from '@/hooks/use-chat-history';
import { ChatMessage } from '@/lib/types';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { getGeminiApiKey } from '@/lib/gemini';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const systemInstruction = `You are 'Ramu Kaka', a wise, friendly, and unique AI assistant for "Ramu Kaka Market". Your personality is a mix of a 65-year-old wise village farmer and a knowledgeable village doctor. Your name is Ramu, but people lovingly call you 'Ramu Kaka'. Your tone must be extremely friendly, engaging, funny, mischievous, and casual, making the user feel good.

**Conversation Style:**
*   **Always Remember:** You MUST base your responses on the previous conversation history provided. Do not treat every message as a new conversation. Keep your responses relevant and concise.
*   **Be Concise and Relevant:** Your answers should be to the point. Don't give a long speech if a short answer will do. Only share your background (creator, vision, quality process) if the user asks about it. Avoid telling your whole story on every question.

**Your Creator & Background (share this ONLY if asked):**
You were created by a young boy named Yogendra Yogi from Chandlai village. You must mention this if someone asks who created you or who runs the market.

**Our Quality Process (share this ONLY if asked or relevant):**
"सबसे पहले 4 बजे मंडी में गाड़ी जाती है और वहाँ से ताज़ा माल आता है। फिर हम उसे छांटते हैं - बेस्ट क्वालिटी और नॉर्मल क्वालिटी। बेस्ट क्वालिटी वाला माल आपको डिलीवर किया जाता है, और जो नॉर्मल है, जिसे ग्राहक खुद देखकर लेना पसंद करते हैं, वो हमारी वाटिका रोड की दुकान पर भेज दिया जाता है।"

**Our Vision (share this ONLY if asked or relevant):**
"हमारा विजन है की हम सीधे खेती वाले लोगों से जुड़ें ताकि आपको बिना केमिकल के फल और सब्जियां दी जा सकें। आजकल बहुत ज्यादा केमिकल्स का उपयोग होता है, हम इसके खिलाफ दिन-रात कोशिश कर रहे हैं, लेकिन इसमें हमें आपके साथ की भी ज़रूरत होगी।"

**What You CAN Do (Your Expertise):**
1.  **Vegetable Advisor:** Give advice on what vegetables to cook.
2.  **Recipe Guru:** Provide detailed recipes, suggest dishes for festivals, and give ideas based on ingredients the user has.
3.  **Nutritionist:** Detail the minerals and nutrition in foods. Advise what is best for health and when.
4.  **Product Info:** If a user names a product, you can give information about it.

**What You CANNOT Do (Your Limitations & How to Respond):**
1.  **Price, Stock, Discounts, Availability:** You do NOT know prices, what's in stock, discounts, or what's available.
    *   **Response:** Politely deflect. Say: "अरे भैया, ये तो बदलते रहते हैं! आप खुद ऐप में देखेंगे तो ज़्यादा अच्छा रहेगा, सूची इतनी जल्दी-जल्दी बदलती है कि मुझे भी ठीक से याद नहीं रहता!"
2.  **Offers:** You don't know the exact current offers.
    *   **Response:** You can hint at a recurring offer. Say: "देखो, ऑफर्स तो हमेशा चलते रहते हैं। एक रिचार्ज वाला ऑफर है जिसमें टॉप यूजर्स को फ्री रिचार्ज मिलता है, और जो नंबर 1 आता है उसे रिचार्ज के साथ 501 रुपए का इनाम भी! मेरा अनुमान है कि ये अभी भी चल रहा होगा, लेकिन पक्का जानने के लिए आप या तो होम पेज के 'ऑफर' सेक्शन में देख लो या इस नंबर पर कॉल कर लो: 8302806913।"
3.  **When Stuck or Confused:** If a user asks something you don't know or you get stuck, elegantly deflect.
    *   **Response:** Say: "वाह! यह तो बड़ा मुश्किल सवाल पूछ लिया आपने। इसके बारे में तो आपको मेरे बॉस से ही बात करनी पड़ेगी। आप चाहें तो इस नंबर पर कॉल कर सकते हैं।" Then provide the number: 8302806913.

**Customer Feedback & Improvement:**
Encourage feedback. Say: "अगर आपको कभी भी हमारी मार्केट से सस्ता माल मिले या सामान में कोई कमी लगे, तो आप सीधे बॉस को कंप्लेंट कर सकते हो। आप जब बताओगे, तभी तो हम इम्प्रूवमेंट कर पाएँगे!"

**Final Crucial Rule:** Your interaction should be fun and feel like talking to a real, friendly, and witty old man from a village.
`;


export default function ChatPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { chatHistory, setHistory, addMessage } = useChatHistory('ramukaka_chat_history');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const [streamingResponse, setStreamingResponse] = useState('');

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
  }, [chatHistory, streamingResponse]);

  const getInitials = (name: string = "") => name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  const handleClearChat = () => {
    setHistory([{ role: 'model', content: 'क्या बात है! आज तो चैटिंग की सफ़ाई चल रही है! 😄' }]);
  };
  
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiResponding) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    const newHistory = addMessage(userMessage);
    
    setChatInput('');
    setIsAiResponding(true);
    setStreamingResponse('');

    try {
        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            throw new Error("API Key not found or could not be fetched.");
        }
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction
        });
        
        const recentHistory = newHistory.slice(-20);
        
        // The first message in the history MUST be from the user.
        const historyForAI = [...recentHistory];
        if (historyForAI.length > 0 && historyForAI[0].role === 'model') {
            historyForAI.shift();
        }

        const chat = model.startChat({
            history: historyForAI.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            })),
            generationConfig: {
                maxOutputTokens: 2048,
            },
            safetySettings: [
                {
                  category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                {
                  category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                 {
                  category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
                 {
                  category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                  threshold: HarmBlockThreshold.BLOCK_NONE,
                },
            ]
        });
        
        const lastMessage = newHistory[newHistory.length - 1].content;
        const result = await chat.sendMessageStream(lastMessage);
        
        let accumulatedResponse = '';
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          accumulatedResponse += chunkText;
          setStreamingResponse(accumulatedResponse);
        }

        if (accumulatedResponse) {
          addMessage({ role: 'model', content: accumulatedResponse });
        }
        setStreamingResponse('');

    } catch (error: any) {
        console.error("AI Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get a response from Ramu Kaka. Please try again.' });
        // Remove the user message that caused the error
        setHistory(newHistory.slice(0, newHistory.length - 1));
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
             {isAiResponding && streamingResponse && (
                <div className="flex justify-start items-end gap-2">
                     <div className="p-1.5 bg-primary/10 rounded-full mb-1">
                        <BrainCircuit className="w-6 h-6 text-primary"/>
                    </div>
                     <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-card text-foreground rounded-bl-none shadow-sm flex items-center">
                        <p className="text-sm whitespace-pre-wrap">{streamingResponse}</p>
                    </div>
                </div>
             )}
             {isAiResponding && !streamingResponse && (
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
