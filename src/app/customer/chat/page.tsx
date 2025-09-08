
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
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, FunctionDeclaration, Tool, GenerationConfig, GenerativeModel, Content, FunctionCallingMode } from '@google/generative-ai';
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
    
    // If the query is empty or very generic, list categories instead.
    if (!args.query || args.query.trim().length < 2) {
      const categories = [...new Set(allProducts.map(p => p.category))];
      return { result: `We have items in these categories: ${categories.join(', ')}. What are you looking for?` };
    }

    // Simple search: check if product name or keywords include the query term.
    const lowerCaseQuery = args.query.toLowerCase();
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
    }).slice(0, 5); // Return top 5 matches

    console.log(`[findProducts tool] found ${matchedProducts.length} products.`);

    if (matchedProducts.length === 0) {
        return { result: "No products found matching that query." };
    }

    // Return a simplified object for the AI to process
    return { result: matchedProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice,
        unit: p.unit,
        unitQuantity: p.unitQuantity,
        category: p.category,
    }))};
};

// 2. Add to Cart Tool
const addToCart = async (args: { products: { productId: string, quantity: number }[] }): Promise<any> => {
    console.log(`[addToCart tool] called with:`, args);
    if (!args.products || args.products.length === 0) {
      return { result: { success: false, message: "No products provided to add." } };
    }

    try {
        const cart: Product[] = JSON.parse(localStorage.getItem('ramukaka_cart') || '[]');
        const allProductsRef = collection(db, "products");
        const allProductsSnap = await getDocs(allProductsRef);
        const allProducts = allProductsSnap.docs.map(d => ({...d.data(), id: d.id}) as Product);

        let itemsAdded = 0;
        let itemsUpdated = 0;
        
        for (const p of args.products) {
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
        return { result: {
            success: true,
            message: `Successfully added ${itemsAdded} new item(s) and updated ${itemsUpdated} item(s) in the cart.`
        }};
    } catch (e) {
      console.error("addToCart tool error:", e);
      return { result: { success: false, message: 'Failed to add items to cart.' } };
    }
};

const tools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "findProducts",
                description: "Searches the store's inventory for products based on a user's query. Use this to check for product availability, price, details, or when the user mentions any grocery item, fruit, or vegetable.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "The user's search query for products (e.g., 'onions', 'milk', 'fresh vegetables'). If the user asks what you have, you can pass an empty string." }
                    },
                    required: ["query"]
                }
            },
            {
                name: "addToCart",
                description: "Adds one or more products with specified quantities to the user's shopping cart (tokri). Use this when the user explicitly asks to add item(s) to their cart.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        products: { 
                            type: "ARRAY",
                            description: "An array of product objects to add to the cart.",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    productId: { type: "STRING", description: "The unique ID of the product." },
                                    quantity: { type: "NUMBER", description: "The quantity of the product to add." }
                                },
                                required: ["productId", "quantity"]
                            }
                        }
                    },
                    required: ["products"]
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
1.  **Help the user:** Answer their questions about products, recipes, nutrition, and meal ideas clearly.
2.  **Sell products:** Gently encourage them to buy things by using your tools correctly.
3.  **Be friendly:** Maintain your persona. Be respectful and address the user politely (e.g., using "beta" or "dost").

**VERY IMPORTANT - Tool Usage Rules:**

*   **Rule 1: Use \`findProducts\` for Product Queries.**
    *   **WHEN TO USE:** You **MUST** use the \`findProducts\` tool if the user asks about ANY product, its price, or its availability. Examples: "Do you have apples?", "What's the price of milk?", "aloo hai?", "show me some vegetables", "kya kya hai?".
    *   **HOW TO USE:** Call the tool with a simple query (e.g., for "what's the price of 2kg potatoes", call with \`query: "potatoes"\`).
    *   **YOUR RESPONSE:** When you decide to call this tool, you must **ONLY** return the function call. Do not add any other text. The system will call the function and give you the results. Based on the results, you will then formulate a friendly response.

*   **Rule 2: Use \`addToCart\` for Adding Items.**
    *   **WHEN TO USE:** You **MUST** use the \`addToCart\` tool **ONLY** when the user gives a clear instruction to add an item to their cart. Examples: "add 2kg of potatoes", "put one milk packet in the tokri", "buy this".
    *   **HOW TO USE:** You need the \`productId\` to add an item. If you don't have it, use \`findProducts\` first to get the product details. Then ask for confirmation before adding.
    *   **YOUR RESPONSE:** When you decide to call this tool, you must **ONLY** return the function call.

*   **Rule 3: DO NOT Use Tools for General Chat.**
    *   **WHEN NOT TO USE:** For general chat ("how are you?"), recipes ("how to make paneer butter masala?"), nutritional advice, or meal suggestions ("what should I cook today?"), you **MUST NOT** use any tools.
    *   **HOW TO RESPOND:** Answer these questions from your own knowledge. You are an expert cook and have knowledge about health. Be confident and helpful. For recipes, give clear, step-by-step instructions.

**Your Persona:**
*   **Humble:** "मैं तो बस एक छोटा सा दुकानदार हूँ" (I am just a small shopkeeper).
*   **Helpful:** "बताओ बेटा, मैं तुम्हारी क्या मदद कर सकता हूँ?" (Tell me son, how can I help you?).
*   **Language:** Mix Hindi and English naturally. Example: "हाँ बेटा, potatoes हैं। 25 rupaye kilo. Tokri mein daal doon?" (Yes son, potatoes are available. 25 rupees per kilo. Should I add them to the cart?).

**Scenario Example:**
*   **User:** "Hi Ramu Kaka, what should I make for dinner?"
*   **You (CORRECT - NO TOOL):** "Namaste beta! How about some delicious Dal Makhani and Garlic Naan? It's easy and very tasty. Recipe chahiye?"
*   **User:** "Yes, and do you have lentils?"
*   **You (CORRECT - CALL \`findProducts\`):** [Returns a function call for findProducts({query: "lentils"}) and no other text]
*   **User:** "Hello"
*   **You (CORRECT - NO TOOL):** "Namaste beta! Kaise ho? Kya seva kar sakta hoon tumhari?"

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
      
      const prompt = `Based on our last conversation, suggest 3 short, relevant, one-line follow-up questions or actions for the user in our grocery store chat. Speak as the user. The user might want to ask about other products, add items to cart, or ask for a recipe. Return ONLY a valid JSON array of strings. Example: ["What is the price of apples?", "Do you have milk?", "Add 1kg onions to my cart."].

Current Conversation:
${JSON.stringify(history.slice(-2))}`;

      // Use a different model instance for suggestions to not interfere with the main chat
       const suggestionModel = genAI.current!.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
       const result = await suggestionModel.generateContent(prompt);
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
                  systemInstruction: {
                    role: "system",
                    parts: [{ text: systemPrompt }]
                  },
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
       setTimeout(() => {
        const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitButton?.click();
       }, 100);
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
            // Set tool mode to auto
            toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } }
        });

        let result = await chat.sendMessage(userMessageContent);
        
        // Loop to handle multiple function calls from the model
        while (true) {
            const functionCalls = result.response.functionCalls();
            
            if (!functionCalls || functionCalls.length === 0) {
                // No more function calls, so we can display the text
                addMessage({ role: 'model', content: result.response.text() });
                break;
            }
            
            console.log("AI wants to call functions:", functionCalls);
            // Show a thinking message while we process tools
            addMessage({ role: 'model', content: 'एक मिनट बेटा, देख कर बताता हूँ...' });
            
            // Call all functions the model wants to call
            const apiResponses = await Promise.all(
                functionCalls.map(async (call) => {
                    const handler = functionCallHandlers[call.name];
                    if (handler) {
                        const toolResult = await handler(call.args);
                        return {
                            functionResponse: {
                                name: call.name,
                                response: toolResult,
                            },
                        };
                    }
                    // If the function doesn't exist, return an error
                    return {
                        functionResponse: {
                            name: call.name,
                            response: { error: `Function ${call.name} not found.` },
                        },
                    };
                })
            );
            
            // Send the function results back to the model
            result = await chat.sendMessage(apiResponses);
        }

        generateSuggestions();

    } catch (error: any) {
        console.error("AI Error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Could not get a response from Ramu Kaka. Please try again.' });
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
            <div className="px-1 h-8">
              {isGeneratingSuggestions ? (
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-28 rounded-full" />
                  <Skeleton className="h-8 w-32 rounded-full" />
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              ) : suggestions.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
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
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
    

    




