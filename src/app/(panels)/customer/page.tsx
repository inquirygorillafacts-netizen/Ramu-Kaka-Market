
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, where, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, Order, CartItem } from '@/lib/types';
import { Loader2, Package, ShoppingBag, History, BadgePercent, Sparkles, Handshake } from 'lucide-react';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';


export default function CustomerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productsData: Product[] = [];
      querySnapshot.forEach((doc) => {
        productsData.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(productsData);
      setLoadingProducts(false);
    }, (error) => {
        console.error("Error fetching products:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch products.'});
        setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!currentUser) return;
    setLoadingOrders(true);
    const q = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const ordersData: Order[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            ordersData.push({
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate(),
            } as Order);
        });
        setOrders(ordersData);
        setLoadingOrders(false);
    }, (error) => {
        console.error("Error fetching orders:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your orders.'});
        setLoadingOrders(false);
    });

    return () => unsubscribe();

  }, [currentUser, toast]);


  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
    toast({
        title: "Added to cart!",
        description: `${product.name} is now in your shopping bag.`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) => {
        const existingItem = prevCart.find(item => item.id === productId);
        if (existingItem && existingItem.quantity > 1) {
            return prevCart.map(item => item.id === productId ? {...item, quantity: item.quantity - 1} : item);
        }
        return prevCart.filter((item) => item.id !== productId);
    });
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const placeOrder = async () => {
    if (cart.length === 0 || !currentUser) {
      toast({
        variant: 'destructive',
        title: 'Cannot place order',
        description: 'Your cart is empty or you are not logged in.',
      });
      return;
    }

    setPlacingOrder(true);
    try {
      await addDoc(collection(db, 'orders'), {
        customerId: currentUser.uid,
        customerName: currentUser.displayName || 'Anonymous',
        items: cart,
        total: getCartTotal(),
        status: 'Pending',
        createdAt: new Date(),
      });
      toast({
        title: 'Order Placed!',
        description: 'Your order has been successfully placed.',
      });
      setCart([]);
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
  };
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Pending': return <Badge variant="secondary">{status}</Badge>;
      case 'Assigned': return <Badge>{status}</Badge>;
      case 'Out for Delivery': return <Badge className="bg-blue-500 hover:bg-blue-600">{status}</Badge>;
      case 'Delivered': return <Badge className="bg-green-500 hover:bg-green-600">{status}</Badge>;
      case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }


  return (
    <Tabs defaultValue="shop" className="space-y-6">
        <div className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary">Welcome, {currentUser?.displayName || 'Customer'}!</h1>
                    <p className="text-muted-foreground mt-2 font-highlight text-lg">Your friendly neighborhood market is ready for you.</p>
                </div>
                <TabsList>
                    <TabsTrigger value="shop"><ShoppingBag className="mr-2 h-4 w-4" />Shop</TabsTrigger>
                    <TabsTrigger value="orders"><History className="mr-2 h-4 w-4" />My Orders</TabsTrigger>
                </TabsList>
            </div>
        </div>
      
        <TabsContent value="shop">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                        <CardTitle>Products</CardTitle>
                        <CardDescription>Browse our fresh selection of products.</CardDescription>
                        </CardHeader>
                        <CardContent>
                        {loadingProducts ? (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {products.map((product) => (
                                <Card key={product.id} className="flex flex-col">
                                    <CardHeader className="p-0">
                                        <div className="relative aspect-square w-full">
                                            <Image src={product.imageUrl} alt={product.name} fill className="object-cover rounded-t-lg"/>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 flex-grow">
                                        <h3 className="font-semibold">{product.name}</h3>
                                        <p className="text-muted-foreground text-sm">₹{product.price.toFixed(2)}</p>
                                    </CardContent>
                                    <CardFooter className="p-4 pt-0">
                                        <Button className="w-full" onClick={() => addToCart(product)}>Add to Cart</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                            </div>
                        )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                        <CardTitle>Your Cart</CardTitle>
                        <CardDescription>Items you have added.</CardDescription>
                        </CardHeader>
                        <CardContent>
                        {cart.length === 0 ? (
                            <p className="text-muted-foreground">Your cart is empty.</p>
                        ) : (
                            <div className="space-y-4">
                            {cart.map((item) => (
                                <div key={item.id} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{item.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                            ₹{item.price.toFixed(2)} x {item.quantity}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                                        <Button variant="outline" size="sm" onClick={() => removeFromCart(item.id)}>-</Button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        )}
                        </CardContent>
                        {cart.length > 0 && (
                        <CardFooter className="flex flex-col gap-4">
                            <div className="flex justify-between w-full font-bold text-lg">
                                <span>Total</span>
                                <span>₹{getCartTotal().toFixed(2)}</span>
                            </div>
                            <Button className="w-full" onClick={placeOrder} disabled={placingOrder}>
                            {placingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Place Order
                            </Button>
                        </CardFooter>
                        )}
                    </Card>
                </div>
            </div>
        </TabsContent>

        <TabsContent value="orders">
            <Card>
                <CardHeader>
                    <CardTitle>Your Order History</CardTitle>
                    <CardDescription>Check the status of your past and current orders.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingOrders ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : orders.length === 0 ? (
                        <p className="text-muted-foreground text-center py-10">You haven't placed any orders yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {orders.map(order => (
                                <Card key={order.id} className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">Order ID: {order.id.substring(0, 7)}...</p>
                                            <p className="text-sm text-muted-foreground">{order.createdAt.toLocaleString()}</p>
                                            <div className="mt-2">
                                                {getStatusBadge(order.status)}
                                                {order.deliveryPersonName && <Badge variant="outline" className="ml-2">Handled by: {order.deliveryPersonName}</Badge>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">₹{order.total.toFixed(2)}</p>
                                            <p className="text-sm text-muted-foreground">{order.items.length} items</p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
    </Tabs>
  );
}
