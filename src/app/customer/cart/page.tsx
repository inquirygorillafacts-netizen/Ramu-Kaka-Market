'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, CartItem, UserProfile, Order } from '@/lib/types';
import { Loader2, ShoppingBasket, Trash2, X, AlertTriangle, MapPin, Phone, User as UserIcon, Gift, CreditCard, Wallet } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


declare const Razorpay: any;

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [orderData, setOrderData] = useState({ name: '', mobile: '', address: '', pincode: '', village: '', paymentMethod: 'COD' as 'COD' | 'Online'});
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPromoDialogOpen, setIsPromoDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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
        if (savedCart) setCart(JSON.parse(savedCart));

        const savedProfile = localStorage.getItem('ramukaka_profile');
        const localProfile: Partial<UserProfile> = savedProfile ? JSON.parse(savedProfile) : {};

        let finalProfile = localProfile;

        const user = auth.currentUser;
        if(user) {
             const userDoc = await getDoc(doc(db, 'users', user.uid));
             if (userDoc.exists()) {
                 const firebaseProfile = userDoc.data();
                 finalProfile = { ...localProfile, ...firebaseProfile };
             }
        }
        setProfile(finalProfile);
        setOrderData({
            name: finalProfile.name || '',
            mobile: finalProfile.mobile || '',
            address: finalProfile.address || '',
            pincode: finalProfile.pincode || '',
            village: finalProfile.village || '',
            paymentMethod: finalProfile.paymentMethod || 'COD'
        });
        setLoading(false);
    }
    loadData();
  }, []);

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
  
  const handleCheckout = async () => {
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to place an order.' });
        return;
    }

    if (!orderData.name || !orderData.mobile || !orderData.address || !orderData.pincode) {
        toast({ variant: 'destructive', title: 'Information Missing', description: 'Please fill all address and contact details.' });
        return;
    }

    if (orderData.paymentMethod === 'COD') {
        setIsConfirmOpen(false); // Close details dialog
        setIsPromoDialogOpen(true); // Open promo dialog
    } else {
        await initiateOnlinePayment();
    }
  }

  const handleOnlinePaymentChoice = () => {
    setIsPromoDialogOpen(false);
    toast({
      title: 'Great choice!',
      description: "You're now in the running to win.",
    });
    initiateOnlinePayment();
  }

  const initiateOnlinePayment = async () => {
    setPlacingOrder(true);
    try {
        const response = await fetch('/api/razorpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: getCartTotal() * 100 }) // amount in paisa
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
                email: currentUser!.email,
                contact: orderData.mobile
            },
            theme: {
                color: "#4CAF50"
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
    } finally {
        setIsConfirmOpen(false); // Close details dialog
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
            mapLat: profile.mapLat || null,
            mapLng: profile.mapLng || null,
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
        updateCart([]); // Clear the cart
        setIsConfirmOpen(false);
        setIsPromoDialogOpen(false);
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
        <div className="text-center py-20 flex flex-col items-center animate-fade-in-up">
            <ShoppingBasket className="w-24 h-24 text-muted-foreground/30 mb-4"/>
            <h2 className="text-xl font-semibold">Your Tokri is Empty</h2>
            <p className="text-muted-foreground mt-2">Looks like you haven't added anything yet.</p>
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
                            <p className="text-sm text-muted-foreground">per {item.unit}</p>
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

            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
              <DialogTrigger asChild>
                <Button className="w-full h-12 text-lg">
                    <ShoppingBasket className="mr-2 h-5 w-5"/>
                    Place Order
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Delivery Details</DialogTitle>
                  <DialogDescription>
                    Your order will be delivered to this address. You can edit the details for this specific order.
                  </DialogDescription>
                </DialogHeader>
                <div className="my-4 space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" value={orderData.name} onChange={(e) => setOrderData({...orderData, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <Input id="mobile" value={orderData.mobile} onChange={(e) => setOrderData({...orderData, mobile: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="address">Address (House, Street)</Label>
                        <Input id="address" value={orderData.address} onChange={(e) => setOrderData({...orderData, address: e.target.value})} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="village">Village/Town</Label>
                        <Input id="village" value={orderData.village} onChange={(e) => setOrderData({...orderData, village: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input id="pincode" value={orderData.pincode} onChange={(e) => setOrderData({...orderData, pincode: e.target.value})} />
                  </div>
                  <Separator/>
                   <div className="space-y-3">
                        <Label>Payment Method</Label>
                        <RadioGroup
                            value={orderData.paymentMethod}
                            onValueChange={(value: 'COD' | 'Online') => setOrderData({...orderData, paymentMethod: value})}
                            className="flex gap-4"
                        >
                            <Label htmlFor="cod" className="flex items-center gap-2 border rounded-md p-3 flex-1 has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
                                <RadioGroupItem value="COD" id="cod" />
                                <Wallet className="w-5 h-5 text-muted-foreground" />
                                Cash on Delivery
                            </Label>
                             <Label htmlFor="online" className="flex items-center gap-2 border rounded-md p-3 flex-1 has-[:checked]:bg-primary/10 has-[:checked]:border-primary cursor-pointer">
                                <RadioGroupItem value="Online" id="online" />
                                <CreditCard className="w-5 h-5 text-muted-foreground" />
                                Online Payment
                            </Label>
                        </RadioGroup>
                    </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={placingOrder}>Go Back</Button>
                  <Button onClick={handleCheckout} disabled={placingOrder}>
                    {placingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {placingOrder ? 'Processing...' : `Confirm & Pay ₹${getCartTotal().toFixed(2)}`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isPromoDialogOpen} onOpenChange={setIsPromoDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-yellow-100 rounded-full">
                                <Gift className="w-10 h-10 text-yellow-500" />
                            </div>
                        </div>
                        <AlertDialogTitle className="text-center text-2xl font-headline">One More Step to Win!</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-base">
                            Pay online and get a chance to win exciting rewards every month, including a grand prize of ₹500!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 mt-4">
                        <Button variant="outline" onClick={() => saveOrderToFirebase('COD')} disabled={placingOrder} className="w-full">
                           {placingOrder && orderData.paymentMethod === 'COD' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                           Pay with COD
                        </Button>
                         <Button onClick={handleOnlinePaymentChoice} disabled={placingOrder} className="w-full bg-gradient-to-r from-green-500 to-primary hover:from-green-600 hover:to-primary/90 text-white shadow-lg">
                           {placingOrder && orderData.paymentMethod === 'Online' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                           Pay Online & Win
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
      )}
    </div>
  );
}
