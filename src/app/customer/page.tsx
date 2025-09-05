
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, where, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, Order, CartItem, ProductCategory, Banner, UserProfile } from '@/lib/types';
import { Loader2, Package, ShoppingBag, History, Star, Soup, Apple, Beef, Wheat, Bell, User as UserIcon, Search, BadgePercent, HelpCircle, GitCompareArrows } from 'lucide-react';
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
  const [banners, setBanners] = useState<Banner[]>([]);
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

    // Banners
    const bannersQuery = query(collection(db, 'banners'), where('active', '==', true));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
        setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
    });

    // Cart from local storage
    const savedCart = localStorage.getItem('ramukaka_cart');
    if (savedCart) {
        setCart(JSON.parse(savedCart));
    }

    return () => {
      unsubscribeAuth();
      unsubscribeProducts();
      unsubscribeBanners();
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
      prods = prods.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return prods;
  }, [products, searchQuery]);
  
  const getInitials = (name: string = "") => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const getBannerUrl = (id: string) => banners.find(b => b.id === id)?.imageUrl;

  if (loading) {
      return (
          <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-muted/20 min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={userProfile?.photoUrl || ''} alt={userProfile?.name || 'User'} />
                    <AvatarFallback>{getInitials(userProfile?.name || 'U')}</AvatarFallback>
                </Avatar>
            </div>
            <h1 className="font-bold text-lg font-headline text-primary">Ramu Kaka</h1>
            <Button variant="ghost" size="icon">
                <Bell className="h-6 w-6"/>
            </Button>
        </header>

        {/* Search */}
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
            <Input 
              placeholder="Search for products..." 
              className="pl-10 text-base rounded-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {/* Top Banner */}
        <div className="aspect-[2/1] bg-card rounded-xl overflow-hidden shadow-sm">
            {getBannerUrl('banner1') ? (
                <Image src={getBannerUrl('banner1')!} alt="Promotional Banner 1" fill className="object-cover"/>
            ) : (
                <div className="flex items-center justify-center h-full bg-muted/50 text-muted-foreground">Banner 1</div>
            )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 text-center">
            <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-lg bg-card shadow-sm">
                <BadgePercent className="h-6 w-6 text-destructive"/>
                <span className="text-xs font-semibold">Offers</span>
            </Button>
             <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-lg bg-card shadow-sm">
                <HelpCircle className="h-6 w-6 text-primary"/>
                <span className="text-xs font-semibold">Help</span>
            </Button>
             <Button variant="outline" className="flex flex-col h-20 gap-2 rounded-lg bg-card shadow-sm">
                <GitCompareArrows className="h-6 w-6 text-green-600"/>
                <span className="text-xs font-semibold">Compare</span>
            </Button>
        </div>

        {/* Bottom Banner */}
         <div className="aspect-[2/1] bg-card rounded-xl overflow-hidden shadow-sm">
            {getBannerUrl('banner2') ? (
                <Image src={getBannerUrl('banner2')!} alt="Promotional Banner 2" fill className="object-cover"/>
            ) : (
                <div className="flex items-center justify-center h-full bg-muted/50 text-muted-foreground">Banner 2</div>
            )}
        </div>
    </div>
  );
}
