
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, Order, CartItem, ProductCategory, Banner, UserProfile } from '@/lib/types';
import { Loader2, Package, ShoppingBag, History, Star, Soup, Apple, Beef, Wheat, Bell, User as UserIcon, Search, BadgePercent, HelpCircle, GitCompareArrows, Plus, Minus, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


type CategoryFilter = 'All' | ProductCategory;

const categoryIcons = {
  All: Package,
  Vegetables: Soup,
  Fruits: Apple,
  Grocery: Wheat,
  Cafe: Beef,
};

export default function CustomerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // Auth state and user profile fetching
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile({ id: user.uid, ...userDoc.data() } as UserProfile);
        }
      } else {
        setUserProfile(null);
      }
    });

    // Products
    const prodQuery = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(prodQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    // Cart from local storage
    const savedCart = localStorage.getItem('ramukaka_cart');
    if (savedCart) {
        setCart(JSON.parse(savedCart));
    }

    return () => {
      unsubscribeAuth();
      unsubscribeProducts();
    };
  }, []);

  useEffect(() => {
    // Save cart to local storage whenever it changes
    if (typeof window !== 'undefined') {
        localStorage.setItem('ramukaka_cart', JSON.stringify(cart));
    }
  }, [cart]);


  const filteredProducts = useMemo(() => {
    let prods = products;
    if (searchQuery) {
      prods = prods.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())));
    }
    return prods;
  }, [products, searchQuery]);
  
  const getInitials = (name: string = "") => name.split(' ').map(n => n[0]).join('').toUpperCase();

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

  const getCartItem = (productId: string) => {
      return cart.find(item => item.id === productId);
  }

  if (loading) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                    <AvatarImage src={userProfile?.photoUrl || ''} alt={userProfile?.name || 'User'} />
                    <AvatarFallback>{getInitials(userProfile?.name || 'U')}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="text-sm text-muted-foreground">Welcome,</p>
                    <p className="font-bold text-lg text-foreground">{userProfile?.name || 'Guest'}</p>
                </div>
            </div>
            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-secondary text-primary">
                <ShoppingCart className="h-6 w-6"/>
            </Button>
        </header>

        {/* Search */}
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
            <Input 
              placeholder="Search for products..." 
              className="pl-12 text-base rounded-full h-14 bg-secondary border-transparent focus:bg-white focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {/* This will be the new products section */}
        <section>
            <h2 className="text-2xl font-bold mb-4">Products</h2>
             <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map(product => {
                    const cartItem = getCartItem(product.id);
                    const priceToShow = product.discountPrice ?? product.price;
                    return (
                        <div key={product.id} className="bg-card p-3 rounded-2xl shadow-sm flex flex-col">
                            <div className="bg-secondary rounded-xl mb-4 relative aspect-square w-full">
                               <Image src={product.images[0]} alt={product.name} fill className="object-contain p-2"/>
                            </div>
                            <h3 className="font-bold text-base flex-grow">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">{product.unit}</p>
                            <div className="flex justify-between items-center mt-3">
                                <p className="font-bold text-lg">
                                    ₹{priceToShow.toFixed(2)}
                                    {product.discountPrice && (
                                        <span className="ml-1.5 line-through text-muted-foreground font-normal text-sm">
                                            ₹{product.price.toFixed(2)}
                                        </span>
                                    )}
                                </p>
                                {cartItem ? (
                                    <div className="flex items-center gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20" onClick={() => removeFromCart(product.id)}>
                                            <Minus className="h-4 w-4 text-primary"/>
                                        </Button>
                                        <span className="font-bold w-4 text-center">{cartItem.quantity}</span>
                                         <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20" onClick={() => addToCart(product)}>
                                            <Plus className="h-4 w-4 text-primary"/>
                                        </Button>
                                    </div>
                                ) : (
                                    <Button size="icon" className="h-8 w-8 rounded-full bg-primary text-primary-foreground" onClick={() => addToCart(product)}>
                                        <Plus className="h-4 w-4"/>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )
                })}
             </div>
        </section>

    </div>
  );
}

    