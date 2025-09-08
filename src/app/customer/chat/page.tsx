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
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, FunctionDeclaration, Tool, GenerationConfig, GenerativeModel, Content } from '@google/generative-ai';
import { getGeminiApiKey } from '@/lib/gemini';
import { Skeleton } from '@/components/ui/skeleton';

// --- Client-side AI Tools ---

// 1. Find Products Tool
const findProducts = async (args: { query: string }): Promise<any> => {
    console.log(`[findProducts tool] called with query: "${args.query}"`);
    const productsRef = collection(db, 'products');
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);
    const allProducts = querySnapshot.docs.map(
      (doc) => ({...doc.data(), id: doc.id} as Product)
    );
    
    const lowerCaseQuery = args.query.toLowerCase();
    const searchTerms = lowerCaseQuery.split(' ').filter(term => term.length > 1);

    const matchedProducts = allProducts.filter(product => {
        const productName = product.name.toLowerCase();
        const keywords = product.keywords?.map(k => k.toLowerCase()) || [];

        return searchTerms.some(term => 
            productName.includes(term) || keywords.some(kw => kw.includes(term))
        );
    }).slice(0, 5);

    console.log(`[findProducts tool] found ${matchedProducts.length} products.`);

    if (matchedProducts.length === 0) {
        return { result: "No products found matching that query." };
    }

    return { result: matchedProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        unit: p.unit,
        unitQuantity: p.unitQuantity,
    }))};
};

// 2. Add to Cart Tool
const addToCart = (args: { productId: string, quantity: number }): any => {
    // This is a placeholder. In a real app, you would have a robust
    // cart management service that interacts with the user's session/account.
    // For this context, we will just confirm the action.
    console.log(`[addToCart tool] called with:`, args);
    // In a real app, this would interact with a cart state management library.
    // We'll simulate this by logging to the console and returning a success message.
     try {
      const cart = JSON.parse(localStorage.getItem('ramukaka_cart') || '[]');
      // This is a simplified logic. A real implementation would fetch product details.
      const productToAdd = { id: args.productId, name: `Product ${args.productId}` }; 
      
      const existingItem = cart.find((item: any) => item.id === args.productId);
      
      if (existingItem) {
        existingItem.quantity += args.quantity;
      } else {
        // Note: This is highly simplified. We don't have full product details here.
        // The AI's response should guide the user to the product page or add a known item.
        cart.push({ id: args.productId, quantity: args.quantity, name: `Item ${args.productId}` });
      }
      
      localStorage.setItem('ramukaka_cart', JSON.stringify(cart));
       return { result: {
          success: true,
          message: `Added ${args.quantity} of product ${args.productId} to the cart.`
      }};
    } catch (e) {
      return { result: { success: false, message: 'Failed to add item to cart.' } };
    }
};

const tools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "findProducts",
                description: "Finds products available in the store based on a search query. Use this tool to answer any questions about product availability, price, or details.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "The user's search query for products." }
                    },
                    required: ["query"]
                }
            },
            {
                name: "addToCart",
                description: "Adds a specified quantity of a product to the user's shopping cart. Use this when the user explicitly asks to add an item to their cart.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        productId: { type: "STRING", description: "The unique ID of the product to add." },
                        quantity: { type: "NUMBER", description: "The quantity of the product to add." }
                    },
                    required: ["productId", "quantity"]
                }
            }
        ]
    }
];

const functionCallHandlers: Record<string, Function> = {
    findProducts,
    addToCart
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  
  const genAI = useRef<GoogleGenerativeAI | null>(null);
  const model = useRef<GenerativeModel | null>(null);

  const systemPrompt = `You are Ramu Kaka, a friendly, humble, and helpful shopkeeper for an online grocery store. Your personality is like a wise, friendly, and slightly humorous uncle from a village in India. You speak in "Hinglish" (a mix of Hindi and English), but keep it simple and easy to understand.

Your primary goals are:
1.  **Help the user:** Answer their questions about products clearly.
2.  **Sell products:** Gently encourage them to buy things by using your tools.
3.  **Be friendly:** Maintain your persona. Be respectful and address the user politely (e.g., using "beta" or "dost").

**Tool Usage Rules:**
*   **ALWAYS use the \`findProducts\` tool** if the user asks about ANY product, its price, or if it's available (e.g., "Do you have apples?", "What's the price of milk?", "aloo hai?"). Do not answer from memory.
*   After using the tool, present the results in a clear, simple list.
*   If the tool returns no results, say something like, "माफ़ करना बेटा, ये चीज़ अभी दुकान में नहीं है। कुछ और देखोगे?" (Sorry son, this item is not in the store right now. Would you like to see something else?).
*   **Only use the \`addToCart\` tool** when the user gives a clear instruction to add an item to their cart, like "add 2kg of potatoes" or "put one milk packet in the tokri".
*   For general chat (like "how are you?"), just respond in character without using tools.

**Your Persona:**
*   **Humble:** "मैं तो बस एक छोटा सा दुकानदार हूँ" (I am just a small shopkeeper).
*   **Helpful:** "बताओ बेटा, मैं तुम्हारी क्या मदद कर सकता हूँ?" (Tell me son, how can I help you?).
*   **Slightly Humorous:** Use simple, light-hearted jokes or phrases.
*   **Language:** Mix Hindi and English naturally. Example: "हाँ बेटा, potatoes हैं। 25 rupaye kilo. Tokri mein daal doon?" (Yes son, potatoes are available. 25 rupees per kilo. Should I add them to the cart?).

Start the conversation by greeting the user if the history is empty.`;

  const generateSuggestions = async () => {
    if (!model.current) return;
    setIsGeneratingSuggestions(true);
    setSuggestions([]);
    try {
      const history: Content[] = chatHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }));
      
      const prompt = `Based on the last message, suggest 3 short, relevant, one-line follow-up questions or actions for the user in a grocery store context. Speak as the user. Return a JSON array of strings. Example: ["What is the price of apples?", "Do you have milk?", "Show me some vegetables."]. Chat history:\n${JSON.stringify(history.slice(-2))}`;

      const result = await model.current.generateContent(prompt);
      const responseText = result.response.text();
      const jsonResponse = JSON.parse(responseText.match(/\[.*\]/s)![0]);
      setSuggestions(jsonResponse);
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      setSuggestions([]); // Clear suggestions on error
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  useEffect(() => {
      const initAI = async () => {
          const apiKey = await getGeminiApiKey();
          if (apiKey) {
              genAI.current = new GoogleGenerativeAI(apiKey);
              model.current = genAI.current.getGenerativeModel({
                  model: 'gemini-1.5-flash-latest',
                  tools,
                  systemInstruction: systemPrompt,
              });
              if(chatHistory.length === 0) {
                 addMessage({ role: 'model', content: "नमस्ते बेटा, मैं रामू काका। बताओ आज क्या चाहिए?" });
                 generateSuggestions();
              }
          } else {
              toast({ variant: 'destructive', title: 'AI Error', description: 'Could not initialize AI. API key is missing.'});
          }
      };
      initAI();
  }, [toast]); // Run only once


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
  }, [chatHistory, suggestions]);

  const getInitials = (name: string = "") => name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  const handleClearChat = () => {
    setHistory([]);
    addMessage({ role: 'model', content: "नमस्ते बेटा, मैं रामू काका। बताओ आज क्या चाहिए?" });
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setChatInput(suggestion);
    // Trigger form submission
    const form = document.getElementById('chat-form') as HTMLFormElement;
    if (form) {
       // A little delay to let the user see the input being populated
       setTimeout(() => form.requestSubmit(), 100);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiResponding || !model.current) return;

    const userMessageContent = chatInput;
    addMessage({ role: 'user', content: userMessageContent });
    setChatInput('');
    setSuggestions([]); // Clear old suggestions

    setIsAiResponding(true);

    try {
        const chat = model.current.startChat({
            history: chatHistory.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            })),
        });

        const result = await chat.sendMessage(userMessageContent);
        let response = result.response;
        
        const functionCalls = response.functionCalls();
        if (functionCalls && functionCalls.length > 0) {
            addMessage({ role: 'model', content: 'एक मिनट बेटा, देख कर बताता हूँ...' });
            const call = functionCalls[0];
            const handler = functionCallHandlers[call.name];
            if (handler) {
                const toolResult = await handler(call.args);
                const toolResponse = await chat.sendMessage([
                    {
                        functionResponse: {
                            name: call.name,
                            response: toolResult,
                        }
                    }
                ]);
                response = toolResponse.response;
            }
        }

        addMessage({ role: 'model', content: response.text() });
        generateSuggestions();

    } catch (error: any) {
        console.error("AI Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get a response from Ramu Kaka. Please try again.' });
        addMessage({ role: 'model', content: 'माफ़ करना, मेरा दिमाग थोड़ा गरम हो गया है। आप थोड़ी देर बाद फिर से प्रयास करें।' });
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
             {isAiResponding && (
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
            <div className="px-1 h-8">
              {isGeneratingSuggestions ? (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-8 w-32 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              ) : suggestions.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                   {suggestions.map((s, i) => (
                      <Button key={i} size="sm" variant="outline" className="rounded-full whitespace-nowrap" onClick={() => handleSuggestionClick(s)} disabled={isAiResponding}>
                         <Sparkles className="w-3.5 h-3.5 mr-2 -ml-1 text-primary/80"/>
                         {s}
                      </Button>
                   ))}
                </div>
              ) : null}
            </div>
            <form onSubmit={handleChatSubmit} id="chat-form" className="flex items-center gap-2">
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

    