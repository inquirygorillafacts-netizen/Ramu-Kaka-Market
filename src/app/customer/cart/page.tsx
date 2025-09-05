'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, CartItem, UserProfile, Order } from '@/lib/types';
import { Loader2, ShoppingBasket, Trash2, X, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';


declare const Razorpay: any;

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [profile, setProfile] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
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
    const savedCart = localStorage.getItem('ramukaka_cart');
    const savedProfile = localStorage.getItem('ramukaka_profile');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
    setLoading(false);
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
  
  const handlePlaceOrder = async () => {
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to place an order.' });
        return;
    }

    if (!profile.name || !profile.mobile || !profile.address || !profile.pincode) {
        toast({ variant: 'destructive', title: 'Profile Incomplete', description: 'Please complete your profile before placing an order.' });
        router.push('/customer/profile');
        return;
    }

    setPlacingOrder(true);
    
    if (profile.paymentMethod === 'Online') {
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
                    // Payment successful, now save the order to Firebase
                    await saveOrderToFirebase(response.razorpay_payment_id);
                },
                prefill: {
                    name: profile.name,
                    email: currentUser.email,
                    contact: profile.mobile
                },
                theme: {
                    color: "#4CAF50"
                }
            };
            const rzp = new Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error("Razorpay error:", error);
            toast({ variant: 'destructive', title: 'Payment Error', description: 'Could not initiate online payment.' });
        } finally {
            setPlacingOrder(false);
        }

    } else { // COD
        await saveOrderToFirebase();
        setPlacingOrder(false);
    }
  }

  const saveOrderToFirebase = async (paymentId?: string) => {
    if(!currentUser) return;
    try {
        await addDoc(collection(db, 'orders'), {
            customerId: currentUser.uid,
            customerName: profile.name,
            customerAddress: profile.address,
            customerPincode: profile.pincode,
            customerMobile: profile.mobile,
            items: cart.map(item => ({...item, rating: null, keywords: null})),
            total: getCartTotal(),
            status: 'Pending',
            createdAt: new Date(),
            paymentMethod: profile.paymentMethod,
            paymentId: paymentId || null,
            customerHasViewedUpdate: true,
        });
        toast({
            title: 'Order Placed!',
            description: 'Your order has been successfully placed.',
        });
        updateCart([]); // Clear the cart
        router.push('/customer/orders');
    } catch (error) {
      console.error('Error placing order: ', error);
      toast({
        variant: 'destructive',
        title: 'Order Failed',
        description: 'There was an issue placing your order. Please try again.',
      });
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

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full h-12 text-lg" disabled={placingOrder}>
                    {placingOrder ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingBasket className="mr-2 h-5 w-5"/>}
                    Place Order
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Your Order</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your order will be delivered to the address below. Please confirm.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-4 p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                    <p><strong className="font-medium text-foreground">Name:</strong> {profile.name}</p>
                    <p><strong className="font-medium text-foreground">Address:</strong> {profile.address}, {profile.village}</p>
                    <p><strong className="font-medium text-foreground">Pincode:</strong> {profile.pincode}</p>
                    <p><strong className="font-medium text-foreground">Mobile:</strong> {profile.mobile}</p>
                    <Separator className="my-2"/>
                    <p className="font-bold"><strong className="font-medium text-foreground">Payment:</strong> {profile.paymentMethod}</p>
                </div>
                {(!profile.name || !profile.address || !profile.pincode) && (
                    <div className="flex items-center gap-2 text-destructive p-2 rounded-md border border-destructive/50 bg-destructive/10">
                        <AlertTriangle className="w-5 h-5"/>
                        <p className="text-sm font-medium">Your profile is incomplete. Please update it.</p>
                    </div>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel>Go Back</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePlaceOrder} disabled={placingOrder || !profile.name || !profile.address}>
                    {placingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm & Proceed
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      )}
    </div>
  );
}
