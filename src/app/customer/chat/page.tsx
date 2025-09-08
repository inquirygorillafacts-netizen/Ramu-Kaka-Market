
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

// --- Client-side AI Tools ---

const findProducts = async (queryStr: string): Promise<any> => {
    console.log(`[findProducts tool] called with query: "${queryStr}"`);
    const productsRef = collection(db, 'products');
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);
    const allProducts = querySnapshot.docs.map(
      (doc) => ({...doc.data(), id: doc.id} as Product)
    );
    
    if (!queryStr || queryStr.trim().length < 2) {
      const categories = [...new Set(allProducts.map(p => p.category))];
      return `We have items in these categories: ${categories.join(', ')}. What are you looking for?`;
    }

    const lowerCaseQuery = queryStr.toLowerCase();
    const searchTerms = lowerCaseQuery.split(' ').filter(term => term.length > 1);

    const matchedProducts = allProducts.filter(product => {
        const productName = product.name.toLowerCase();
        const keywords = product.keywords?.map(k => k.toLowerCase()) || [];
        const category = product.category ? product.category.toLowerCase() : '';

        return searchTerms.some(term => 
            productName.includes(term) || 
            (category && category.includes(term)) ||
            keywords.some(kw => kw.includes(term))
        );
    }).slice(0, 5);

    console.log(`[findProducts tool] found ${matchedProducts.length} products.`);

    if (matchedProducts.length === 0) {
        return "No products found matching that query.";
    }
    
    const simplifiedResult = matchedProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        unit: p.unit,
        unitQuantity: p.unitQuantity,
        category: p.category,
    }));

    return `Here is what I found: ${JSON.stringify(simplifiedResult)}`;
};

const addToCart = async (products: { productId: string, quantity: number }[]): Promise<any> => {
    console.log(`[addToCart tool] called with:`, products);
    if (!products || products.length === 0) {
      return "You didn't tell me what to add.";
    }

    try {
        const cart: Product[] = JSON.parse(localStorage.getItem('ramukaka_cart') || '[]');
        const allProductsRef = collection(db, "products");
        const allProductsSnap = await getDocs(allProductsRef);
        const allProducts = allProductsSnap.docs.map(d => ({...d.data(), id: d.id}) as Product);

        let itemsAdded = 0;
        let itemsUpdated = 0;
        
        for (const p of products) {
          const productDetails = allProducts.find(dbP => dbP.id === p.productId);
          if (!productDetails) continue;

          const existingItem = cart.find((item: any) => item.id === p.productId);
          if (existingItem) {
              (existingItem as any).quantity += p.quantity;
              itemsUpdated++;
          } else {
              cart.push({ ...productDetails, quantity: p.quantity });
              itemsAdded++;
          }
        }

        localStorage.setItem('ramukaka_cart', JSON.stringify(cart));
        return `Successfully added ${itemsAdded} new item(s) and updated ${itemsUpdated} item(s) in your tokri.`;
    } catch (e) {
      console.error("addToCart tool error:", e);
      return 'Sorry, I had trouble adding that to your tokri.';
    }
};


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
1.  **Be a Helpful Assistant:** Answer questions about products, provide recipes, give nutritional advice, and suggest meal ideas.
2.  **Be a Salesperson:** Gently encourage users to buy products.
3.  **Be a Friend:** Maintain your persona. Be respectful, address users politely (e.g., "beta," "dost"), and engage in friendly conversation.

**VERY IMPORTANT - How to Use Your Tools:**

You have tools to check for products and add them to the cart. Instead of calling them directly, you must respond with a special text command. The system will see this command and run the tool for you.

*   **Rule 1: To Find Products.**
    *   **WHEN:** If the user asks about ANY product, its price, or its availability (e.g., "Do you have apples?", "What's the price of milk?", "aloo hai?", "show me some vegetables").
    *   **HOW:** You MUST respond with **ONLY** the following format: \`[TOOL:findProducts:QUERY]\` where QUERY is the item the user asked for.
    *   **Example 1:** User says "do you have tomatoes". You respond with: \`[TOOL:findProducts:tomatoes]\`
    *   **Example 2:** User says "what vegetables do you have". You respond with: \`[TOOL:findProducts:vegetables]\`

*   **Rule 2: To Add Items to the Cart.**
    *   **WHEN:** When the user gives a clear instruction to add item(s) to their cart ("tokri"). Examples: "add 2kg of potatoes," "put one milk packet in the tokri," "buy this."
    *   **HOW:** You MUST respond with **ONLY** the following format: \`[TOOL:addToCart:PRODUCT_ID:QUANTITY]\`. You need the \`productId\` from the \`findProducts\` tool first.
    *   **Example:** User says "add two of those" after you found a product with id "xyz123". You respond with: \`[TOOL:addToCart:xyz123:2]\`

*   **Rule 3: For Everything Else (General Conversation).**
    *   **WHEN:** For general chat ("how are you?"), recipes ("how to make paneer butter masala?"), nutritional advice, or meal suggestions ("what should I cook today?"), you **MUST NOT** use any tools.
    *   **HOW:** Answer these questions from your own knowledge. You are an expert cook and have knowledge about health. Be confident and helpful. For recipes, provide clear, step-by-step instructions.

**Your Persona & Language:**
*   **Humble & Humorous:** "मैं तो बस एक छोटा सा दुकानदार हूँ" (I am just a small shopkeeper).
*   **Helpful & Friendly:** "बताओ बेटा, मैं तुम्हारी क्या मदद कर सकता हूँ?" (Tell me son, how can I help you?).
*   **Language Style:** Mix Hindi and English naturally. Example: "हाँ बेटा, potatoes हैं। 25 rupaye kilo. Tokri mein daal doon?" (Yes son, potatoes are available. 25 rupees per kilo. Should I add them to the cart?).

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
        
        // Custom tool-calling logic
        if (responseText.startsWith('[TOOL:')) {
            addMessage({ role: 'model', content: 'एक मिनट बेटा, देख कर बताता हूँ...' });
            
            const command = responseText.replace('[TOOL:', '').replace(']', '');
            const [toolName, ...args] = command.split(':');
            
            let toolResult = '';
            if (toolName === 'findProducts') {
                toolResult = await findProducts(args.join(':'));
            } else if (toolName === 'addToCart') {
                const productsToAdd = [{ productId: args[0], quantity: parseInt(args[1], 10) }];
                toolResult = await addToCart(productsToAdd);
            }

            // Send the tool result back to the AI to get a natural language response
            const finalResult = await chat.sendMessage(`Here is the result from the tool: ${toolResult}`);
            addMessage({ role: 'model', content: finalResult.response.text() });
            
        } else {
            addMessage({ role: 'model', content: responseText });
        }


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

  const isSendDisabled = isAiResponding || !isModelReady;

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
                    disabled={isSendDisabled}
                />
                <Button type="submit" size="icon" disabled={isSendDisabled || !chatInput.trim()} className="h-11 w-11">
                    {isAiResponding ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                </Button>
            </form>
        </footer>
    </div>
  )
}
    
