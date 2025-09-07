
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, CartItem, UserProfile } from '@/lib/types';
import { Loader2, ShoppingBasket, Trash2, X, AlertTriangle, MapPin, Phone, User as UserIcon, Gift, CreditCard, Wallet, Globe, Home, Hash, Lightbulb, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { addDoc, collection, doc, getDoc, getDocs, query } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import Link from 'next/link';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getGeminiApiKey } from '@/lib/gemini';

declare const Razorpay: any;

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
  const [recommendation, setRecommendation] = useState<{greeting: string, recommendation: string} | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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

  const fetchRecommendation = async () => {
    if (cart.length > 0 && profile.name) {
      setLoadingRecommendation(true);
      try {
        // Step 1: Fetch all available products
        const productsQuery = query(collection(db, 'products'));
        const productsSnapshot = await getDocs(productsQuery);
        const allProducts = productsSnapshot.docs.map(doc => doc.data().name).join(', ');

        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            toast({variant: 'destructive', title: 'API Key Error', description: 'Could not find the Gemini API key.'});
            setLoadingRecommendation(false);
            return;
        }
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" },
        });

        const cartItemNames = cart.map(item => `${item.name} (Qty: ${item.quantity})`).join(', ');
        // Step 2: Update the prompt with the list of available products
        const prompt = `You are a friendly and helpful AI assistant for "Ramu Kaka Market", a local grocery store in a village in India. Your persona is like a helpful local shopkeeper who speaks Hindi.

Your task is to provide a warm, personalized greeting and a useful product recommendation based on the customer's cart AND the list of available products. The entire output must be in simple, conversational HINDI.

- Address the customer warmly in Hindi. Use their name, like "Namaste [Customer Name] ji," or a friendly, respectful term like "Namaste Bhabhi ji," or "Namaste Bhaiya,".
- Look at the items in their cart.
- **CRITICAL:** Suggest one other item THAT IS ONLY FROM THE 'Available Products' list. The recommendation must go well with what they're already buying. For example, if they have 'Palak' (spinach), and 'Chana Dal' is in the available list, you could suggest 'Chana Dal'. If 'Panner' is available, you could suggest 'Paneer'.
- Keep the tone very simple, helpful, and personal, like a real shopkeeper would talk.

Customer Name: ${profile.name}
Items in Cart: ${cartItemNames}
Available Products: ${allProducts}

Provide the output in a JSON object with two keys: "greeting" and "recommendation", with both values in HINDI.
`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        setRecommendation(JSON.parse(text));
      } catch (err: any) {
        console.error("AI recommendation error:", err);
        // Don't show toast for quota errors, just fail silently.
        if (!err.message.includes('429')) {
             toast({
                variant: 'destructive',
                title: 'AI Suggestion Failed',
                description: 'Could not get a recommendation at this time.'
            });
        }
        setRecommendation(null);
      } finally {
        setLoadingRecommendation(false);
      }
    } else {
      setRecommendation(null);
    }
  };

  useEffect(() => {
    // Debounce the recommendation fetch
    const handler = setTimeout(() => {
      if (cart.length > 0) {
        fetchRecommendation();
      } else {
        setRecommendation(null);
      }
    }, 1500); // Wait for 1.5s of inactivity

    return () => {
      clearTimeout(handler);
    };
  }, [JSON.stringify(cart), profile.name]);


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
        const keyResponse = await fetch('/api/get-razorpay-key');
        const { keyId } = await keyResponse.json();

        if (!keyId) {
            throw new Error('Could not fetch Razorpay key.');
        }

        const response = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: getCartTotal() * 100 })
        });
        const { order } = await response.json();
        
        const options = {
            key: keyId,
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
        localStorage.removeItem('ramukaka_chat_history'); // Clear chat on successful order
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <Card className="w-full max-w-sm text-center p-8 shadow-lg border-primary/20">
                <CardHeader>
                    <MessageSquare className="w-16 h-16 mx-auto text-primary/80"/>
                </CardHeader>
                <CardContent>
                    <h2 className="text-xl font-semibold mb-2">आपकी टोकरी खाली है</h2>
                    <p className="text-muted-foreground mb-6">कुछ चाहिए तो रामू काका से पूछो!</p>
                    <Button asChild size="lg" className="w-full">
                        <Link href="/customer/chat">रामू काका से पूछें</Link>
                    </Button>
                </CardContent>
            </Card>
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
            
            <Card className="bg-card p-4 rounded-xl shadow-sm border min-h-[64px] flex items-center">
                <CardContent className="p-0 w-full">
                    {loadingRecommendation ? (
                        <div className="space-y-2">
                           <div className="w-full h-4 rounded bg-muted animate-shimmer bg-[length:200%_100%]"></div>
                           <div className="w-2/3 h-4 rounded bg-muted animate-shimmer bg-[length:200%_100%]"></div>
                        </div>
                    ) : recommendation ? (
                         <div className="text-sm text-foreground space-y-2">
                            <p className="font-semibold text-primary flex items-center gap-2"><Lightbulb className="w-5 h-5"/> {recommendation.greeting}</p>
                            <p>{recommendation.recommendation}</p>
                         </div>
                     ) : (
                        <div className="text-sm text-muted-foreground">
                            आपकी टोकरी के लिए सुझाव यहां दिखाई देंगे।
                        </div>
                     )}
                 </CardContent>
             </Card>

            <Button variant="outline" className="w-full" asChild>
                <Link href="/customer/chat">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    रामू काका से कुछ और पूछें
                </Link>
            </Button>
            
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
                      <Button variant="ghost" size="icon" className="absolute right-4 top-4 rounded-full" onClick={() => setIsPromoDialogOpen(false)}>
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                      </Button>
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
                            <a href="tel:8302806913"></a>
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

    
