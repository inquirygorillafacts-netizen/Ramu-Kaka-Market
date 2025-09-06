
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, CartItem, UserProfile, Order } from '@/lib/types';
import { Loader2, ShoppingBasket, Trash2, X, AlertTriangle, MapPin, Phone, User as UserIcon, Gift, CreditCard, Wallet, Globe, Home, Hash, Lightbulb, Send, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getCartRecommendations, GetCartRecommendationsOutput } from '@/ai/flows/get-cart-recommendations';
import { chatWithAssistant, ChatMessage } from '@/ai/flows/conversational-assistant';
import { useChatHistory } from '@/hooks/use-chat-history';


declare const Razorpay: any;

type AssistantMode = 'recommendation' | 'chat';

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [orderData, setOrderData] = useState({ name: '', mobile: '', address: '', pincode: '', village: '', mapLat: '', mapLng: '', paymentMethod: 'Online' as 'COD' | 'Online'});
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [hasShownPromo, setHasShownPromo] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCodConfirmOpen, setIsCodConfirmOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<GetCartRecommendationsOutput | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // State for the new conversational AI assistant
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('recommendation');
  const { chatHistory, addMessage, clearHistory } = useChatHistory('ramukaka_chat_history');
  const [chatInput, setChatInput] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
            setCurrentUser(user);
        } else {
            router.push('/auth');
        }
    });
    return () => unsubscribe();
  },[router])

  useEffect(() => {
    const loadData = async () => {
        const savedCart = localStorage.getItem('ramukaka_cart');
        const parsedCart = savedCart ? JSON.parse(savedCart) : [];
        setCart(parsedCart);
        
        // Determine initial assistant mode
        setAssistantMode(parsedCart.length > 0 ? 'recommendation' : 'chat');

        const savedProfile = localStorage.getItem('ramukaka_profile');
        const localProfile: Partial<UserProfile> = savedProfile ? JSON.parse(savedProfile) : {};

        let finalProfile = localProfile;
        
        const user = auth.currentUser;
        if(user) {
             const userDoc = await getDoc(doc(db, 'users', user.uid));
             if (userDoc.exists()) {
                 const fbProfile = userDoc.data();
                 finalProfile = {
                   name: fbProfile.name || localProfile.name || '',
                   mobile: localProfile.mobile || fbProfile.mobile || '',
                   address: localProfile.address || fbProfile.address || '',
                   village: localProfile.village || fbProfile.village || '',
                   pincode: localProfile.pincode || fbProfile.pincode || '',
                   mapLat: fbProfile.mapLat || localProfile.mapLat || '',
                   mapLng: fbProfile.mapLng || localProfile.mapLng || '',
                   photoUrl: fbProfile.photoUrl || localProfile.photoUrl || '',
                   paymentMethod: localProfile.paymentMethod || 'Online',
                 };
             }
        }
        setProfile(finalProfile);
        setOrderData({
            name: finalProfile.name || '',
            mobile: finalProfile.mobile || '',
            address: finalProfile.address || '',
            village: finalProfile.village || '',
            pincode: finalProfile.pincode || '',
            mapLat: finalProfile.mapLat || '',
            mapLng: finalProfile.mapLng || '',
            paymentMethod: 'Online'
        });
        setLoading(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (cart.length > 0 && profile.name) {
        setAssistantMode('recommendation');
        setLoadingRecommendation(true);
        const cartItemNames = cart.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ');
        getCartRecommendations({customerName: profile.name, cartItems: cartItemNames})
            .then(rec => setRecommendation(rec))
            .catch(err => console.error("AI recommendation error:", err))
            .finally(() => setLoadingRecommendation(false));
    } else {
        setAssistantMode('chat');
        setRecommendation(null);
    }
  }, [cart.length, profile.name]);


  const updateCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('ramukaka_cart', JSON.stringify(newCart));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveItem(productId);
      return;
    }
    const newCart = cart.map((item) =>
      item.id === productId ? { ...item, quantity } : item
    );
    updateCart(newCart);
  };

  const handleRemoveItem = (productId: string) => {
    const newCart = cart.filter((item) => item.id !== productId);
    updateCart(newCart);
    toast({
        title: 'Item Removed',
        description: 'The item has been removed from your tokri.'
    })
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const price = item.discountPrice ?? item.price;
      return total + price * item.quantity;
    }, 0);
  };
  
  const handleOrderNowClick = () => {
      if (placingOrder) return;
      
      if (!currentUser) {
          toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to place an order.' });
          return;
      }
      
      setIsCheckoutDialogOpen(true);
  };

  const handleDetailsSubmit = async () => {
    if (!orderData.name || !orderData.mobile || !orderData.address || !orderData.pincode) {
        toast({ variant: 'destructive', title: 'Information Missing', description: 'Please fill all address and contact details.' });
        return;
    }
    
    setIsCheckoutDialogOpen(false); 

    if (orderData.paymentMethod === 'Online') {
        await initiateOnlinePayment();
    } else { 
        if (!hasShownPromo) {
          setIsPromoDialogOpen(true);
          setHasShownPromo(true);
        } else {
          setIsCodConfirmOpen(true);
        }
    }
  }

  const initiateOnlinePayment = async () => {
    if (!currentUser) return;
    setPlacingOrder(true);
    try {
        const response = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: getCartTotal() * 100 })
        });
        const { order } = await response.json();
        
        const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: "INR",
            name: "Ramu Kaka Market",
            description: "Order Payment",
            order_id: order.id,
            handler: async function (response: any) {
                await saveOrderToFirebase('Online', response.razorpay_payment_id);
            },
            prefill: {
                name: orderData.name,
                email: currentUser!.email || '',
                contact: orderData.mobile
            },
            theme: {
                color: "#4CAF50"
            },
            modal: {
                ondismiss: function() {
                    setPlacingOrder(false);
                    toast({
                        variant: 'destructive',
                        title: 'Payment Cancelled',
                        description: 'You cancelled the payment process.'
                    })
                }
            }
        };
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response:any) {
            toast({ variant: 'destructive', title: 'Payment Failed', description: response.error.description });
            setPlacingOrder(false);
        });
        rzp.open();
    } catch (error) {
        console.error("Razorpay error:", error);
        toast({ variant: 'destructive', title: 'Payment Error', description: 'Could not initiate online payment.' });
        setPlacingOrder(false);
    }
  }

  const saveOrderToFirebase = async (paymentMethod: 'COD' | 'Online', paymentId?: string) => {
    if(!currentUser) return;
    setPlacingOrder(true);
    try {
        await addDoc(collection(db, 'orders'), {
            customerId: currentUser.uid,
            customerName: orderData.name,
            customerAddress: `${orderData.address}, ${orderData.village}`,
            customerPincode: orderData.pincode,
            customerMobile: orderData.mobile,
            mapLat: orderData.mapLat || null,
            mapLng: orderData.mapLng || null,
            items: cart.map(item => ({...item, rating: null, keywords: null})),
            total: getCartTotal(),
            status: 'Pending',
            createdAt: new Date(),
            paymentMethod: paymentMethod,
            paymentId: paymentId || null,
            customerHasViewedUpdate: true,
        });
        toast({
            title: 'Order Placed!',
            description: 'Your order has been successfully placed.',
        });
        updateCart([]); 
        clearHistory();
        setIsCheckoutDialogOpen(false);
        setIsPromoDialogOpen(false);
        setIsCodConfirmOpen(false);
        router.push('/customer/orders');
    } catch (error) {
      console.error('Error placing order: ', error);
      toast({
        variant: 'destructive',
        title: 'Order Failed',
        description: 'There was an issue placing your order. Please try again.',
      });
    } finally {
        setPlacingOrder(false);
    }
  }

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiResponding) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    addMessage(userMessage);
    setChatInput('');
    setIsAiResponding(true);

    try {
        const customerContext = `Village: ${profile.village || 'N/A'}. Current Cart: ${cart.map(i => i.name).join(', ') || 'Empty'}`;
        const response = await chatWithAssistant({
            customerName: profile.name || 'Friend',
            customerContext: customerContext,
            chatHistory: [...chatHistory, userMessage],
            question: chatInput,
        });
        const aiMessage: ChatMessage = { role: 'model', content: response.answer };
        addMessage(aiMessage);
    } catch (error) {
        console.error("Chat AI error:", error);
        toast({ variant: 'destructive', title: 'AI Error', description: 'Sorry, I am having trouble responding right now.'});
        addMessage({role: 'model', content: 'माफ़ कीजिए, मुझे अभी जवाब देने में कुछ परेशानी हो रही है।'});
    } finally {
        setIsAiResponding(false);
    }
  }


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderRecommendationAssistant = () => (
    <>
       {(loadingRecommendation || recommendation) && (
             <div className="bg-card p-4 rounded-xl shadow-sm flex items-start gap-4 border">
                 <Lightbulb className="w-6 h-6 text-primary mt-1"/>
                 {loadingRecommendation ? (
                     <div className="space-y-2 flex-grow">
                        <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
                     </div>
                 ) : recommendation ? (
                     <div className="text-sm text-foreground flex-grow">
                        <p className="font-semibold text-primary">{recommendation.greeting}</p>
                        <p>{recommendation.recommendation}</p>
                     </div>
                 ) : null}
             </div>
        )}
        <Button variant="outline" className="w-full" onClick={() => setAssistantMode('chat')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            कुछ भी पूछें (Ask Anything)
        </Button>
    </>
  );

  const renderChatAssistant = () => (
     <div className="bg-card p-4 rounded-xl shadow-sm space-y-4">
        <div ref={chatContainerRef} className="h-64 overflow-y-auto space-y-4 pr-2">
            {chatHistory.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                   <MessageSquare className="w-12 h-12 mb-2" />
                   <p className="font-semibold">नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?</p>
                   <p className="text-xs">पूछें, "प्रोटीन के लिए कौनसी सब्जी अच्छी है?"</p>
                </div>
            )}
            {chatHistory.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-foreground rounded-bl-none'}`}>
                       <p className="text-sm">{msg.content}</p>
                    </div>
                </div>
            ))}
             {isAiResponding && (
                <div className="flex justify-start">
                     <div className="max-w-xs md:max-w-md p-3 rounded-2xl bg-muted text-foreground rounded-bl-none">
                        <Loader2 className="w-5 h-5 animate-spin"/>
                    </div>
                </div>
             )}
        </div>
        <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
            <Input 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="यहाँ अपना सवाल लिखें..."
                disabled={isAiResponding}
                className="flex-grow"
            />
            <Button type="submit" size="icon" disabled={!chatInput.trim() || isAiResponding}>
                <Send className="w-4 h-4"/>
            </Button>
        </form>
     </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
       <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      <header className="animate-fade-in-down">
          <div className="flex items-center gap-4">
              <ShoppingBasket className="w-8 h-8 text-primary"/>
              <h1 className="text-3xl font-bold font-headline text-primary">Your Tokri</h1>
          </div>
          <p className="text-muted-foreground mt-1">Review your items and proceed to checkout.</p>
      </header>

      {cart.length === 0 ? (
        <div className="text-center py-8 flex flex-col items-center animate-fade-in-up">
            {renderChatAssistant()}
            <Button onClick={() => router.push('/customer')} className="mt-6">Start Shopping</Button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in-up">
            <div className="bg-card p-4 rounded-xl shadow-sm space-y-4">
                {cart.map((item) => (
                    <div key={item.id} className="flex items-start gap-4">
                        <Image src={item.images[0]} alt={item.name} width={80} height={80} className="rounded-lg object-cover aspect-square"/>
                        <div className="flex-grow">
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">per {item.unitQuantity} {item.unit}</p>
                            <p className="font-bold mt-1">₹{(item.discountPrice ?? item.price).toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                           <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleQuantityChange(item.id, item.quantity - 1)}>-</Button>
                                <span className="w-8 text-center font-bold">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => handleQuantityChange(item.id, item.quantity + 1)}>+</Button>
                           </div>
                           <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveItem(item.id)}>
                               <Trash2 className="w-4 h-4 mr-1"/>
                               Remove
                           </Button>
                        </div>
                    </div>
                ))}
            </div>
            
            {assistantMode === 'recommendation' ? renderRecommendationAssistant() : renderChatAssistant()}
            
            <div className="bg-card p-4 rounded-xl shadow-sm space-y-3">
                <h3 className="text-lg font-semibold">Price Details</h3>
                <div className="flex justify-between">
                    <p className="text-muted-foreground">Subtotal</p>
                    <p className="font-medium">₹{getCartTotal().toFixed(2)}</p>
                </div>
                <div className="flex justify-between">
                    <p className="text-muted-foreground">Delivery Fee</p>
                    <p className="font-medium text-primary">FREE</p>
                </div>
                <Separator/>
                <div className="flex justify-between text-xl font-bold">
                    <p>Total Amount</p>
                    <p>₹{getCartTotal().toFixed(2)}</p>
                </div>
            </div>

            <Button className="w-full h-12 text-lg" disabled={placingOrder} onClick={handleOrderNowClick}>
              {placingOrder ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingBasket className="mr-2 h-5 w-5"/>}
              {placingOrder ? 'Placing Order...' : 'Order Now'}
            </Button>

            <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Confirm Delivery Details</DialogTitle>
                  <DialogDescription>
                    Your order will be delivered to this address. You can edit the details for this specific order.
                  </DialogDescription>
                </DialogHeader>
                <div className="my-4 space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="name" value={orderData.name} onChange={(e) => setOrderData({...orderData, name: e.target.value})} className="pl-10"/>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile Number</Label>
                        <div className="relative">
                           <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                           <Input id="mobile" value={orderData.mobile} onChange={(e) => setOrderData({...orderData, mobile: e.target.value})} className="pl-10"/>
                        </div>
                    </div>
                  </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="address">Address (House, Street)</Label>
                        <div className="relative">
                            <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="address" value={orderData.address} onChange={(e) => setOrderData({...orderData, address: e.target.value})} className="pl-10"/>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="village">Village/Town</Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="village" value={orderData.village} onChange={(e) => setOrderData({...orderData, village: e.target.value})} className="pl-10"/>
                        </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="pincode" value={orderData.pincode} onChange={(e) => setOrderData({...orderData, pincode: e.target.value})} className="pl-10"/>
                      </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Google Map Coordinates (Optional)</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="mapLat" value={orderData.mapLat} onChange={(e) => setOrderData({...orderData, mapLat: e.target.value})} placeholder="Latitude" className="pl-10"/>
                        </div>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input id="mapLng" value={orderData.mapLng} onChange={(e) => setOrderData({...orderData, mapLng: e.target.value})} placeholder="Longitude" className="pl-10"/>
                        </div>
                    </div>
                   </div>
                  <Separator/>
                   <div className="space-y-3">
                        <Label>Payment Method</Label>
                        <RadioGroup
                            value={orderData.paymentMethod}
                            onValueChange={(value: 'COD' | 'Online') => setOrderData({...orderData, paymentMethod: value})}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div className="space-y-1">
                                <Label htmlFor="online" className="flex flex-col gap-2 border rounded-md p-3 has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold flex items-center gap-2"><CreditCard className="w-5 h-5 text-muted-foreground" />Online Payment</span>
                                        <RadioGroupItem value="Online" id="online" />
                                    </div>
                                    <span className="text-xs font-semibold text-primary">ऑफर लागू</span>
                                </Label>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="cod" className="flex flex-col gap-2 border rounded-md p-3 has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold flex items-center gap-2"><Wallet className="w-5 h-5 text-muted-foreground" />Cash on Delivery</span>
                                        <RadioGroupItem value="COD" id="cod" />
                                    </div>
                                    <span className="text-xs text-muted-foreground">कोई ऑफर लागू नहीं</span>
                                 </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCheckoutDialogOpen(false)} disabled={placingOrder}>Cancel</Button>
                  <Button onClick={handleDetailsSubmit} disabled={placingOrder}>
                    Confirm Details
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
              <AlertDialogContent className="max-w-md">
                   <AlertDialogHeader>
                      <AlertDialogCancel asChild>
                        <Button variant="ghost" size="icon" className="absolute right-4 top-4 rounded-full" onClick={() => setIsPromoDialogOpen(false)}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                      </AlertDialogCancel>
                      <div className="flex justify-center mb-4">
                          <div className="p-3 bg-yellow-100 rounded-full">
                              <Gift className="w-10 h-10 text-yellow-500" />
                          </div>
                      </div>
                      <AlertDialogTitle className="text-center text-xl font-headline">एक और मौका, इनाम जीतने का!</AlertDialogTitle>
                      <AlertDialogDescription className="text-center text-base/relaxed text-muted-foreground space-y-2">
                        <span>ऑनलाइन पेमेंट करने वाले टॉप 10 लोगों को मिलेगा फ्री रिचार्ज, ओर जो सबसे नंबर one आएगा उसे मिलेगा रिचार्ज के साथ - साथ 501 रूपीए का इनाम भी।</span>
                        <span>तो अब से करो बुकिंग ऑनलाइन क्योंकि पेसे तो वो ही लगेंगे लेकिन इनाम मे भी आपका नाम आए जाएगा।</span>
                      </AlertDialogDescription>
                       <div className="text-center text-sm text-muted-foreground pt-2">
                         <span>कुछ भी सवाल है तो अभी कॉल करो</span>
                         <Button variant="link" className="p-0 h-auto" asChild>
                            <a href="tel:8302806913"> 8302806913</a>
                         </Button>
                       </div>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                     <Button variant="outline" onClick={() => { setIsCodConfirmOpen(true); setIsPromoDialogOpen(false); }}>
                          COD से भुगतान करें
                      </Button>
                      <Button onClick={() => { setIsPromoDialogOpen(false); initiateOnlinePayment(); }}>
                         ऑनलाइन भुगतान करें और जीतें
                      </Button>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

             <AlertDialog open={isCodConfirmOpen} onOpenChange={setIsCodConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        क्या आप वाकई COD के साथ आगे बढ़ना चाहते हैं?
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>नहीं, वापस जाएं</AlertDialogCancel>
                    <AlertDialogAction onClick={() => saveOrderToFirebase('COD')}>
                        हाँ, COD के साथ बुक करें
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
        </div>
      )}
    </div>
  );

}
