
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
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('All');
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
    const bannerQuery = query(collection(db, 'banners'), where('active', '==', true));
    const unsubscribeBanners = onSnapshot(bannerQuery, (snapshot) => {
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
    // Orders
    if (!currentUser) return;
    const orderQuery = query(collection(db, 'orders'), where('customerId', '==', currentUser.uid));
    const unsubscribeOrders = onSnapshot(orderQuery, (snapshot) => {
      const fetchedOrders = snapshot.docs.map(doc => ({...doc.data(), id: doc.id, createdAt: (doc.data().createdAt as Timestamp).toDate() } as Order));
      // Sort orders on the client-side
      const sortedOrders = fetchedOrders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setOrders(sortedOrders);
    });
    return () => unsubscribeOrders();
  }, [currentUser]);

  useEffect(() => {
    // Save cart to local storage whenever it changes
    localStorage.setItem('ramukaka_cart', JSON.stringify(cart));
  }, [cart]);


  const filteredProducts = useMemo(() => {
    let prods = products;
    if (activeCategory !== 'All') {
      prods = prods.filter(p => p.category === activeCategory);
    }
    if (searchQuery) {
      prods = prods.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase())));
    }
    return prods;
  }, [products, activeCategory, searchQuery]);
  
  const getInitials = (name: string = "") => name.split(' ').map(n => n[0]).join('').toUpperCase();
  const getBannerUrl = (id: string) => banners.find(b => b.id === id)?.imageUrl;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-center">
            <Avatar>
                <AvatarImage src={userProfile?.photoUrl || ''} alt={userProfile?.name || 'User'} />
                <AvatarFallback>{getInitials(userProfile?.name || '')}</AvatarFallback>
            </Avatar>
            <h1 className="text-2xl font-bold font-headline text-primary">Ramu Kaka Market</h1>
            <Button variant="ghost" size="icon">
                <Bell className="h-6 w-6"/>
            </Button>
        </div>

        {/* Search */}
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
            <Input 
              placeholder="Search for products..." 
              className="pl-10 text-base"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        {/* Banner 1 */}
        <Card className="aspect-video w-full overflow-hidden relative bg-muted">
             {getBannerUrl('banner1') ? (
                <Image src={getBannerUrl('banner1')!} alt="Promotional Banner 1" fill className="object-cover"/>
             ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Banner 1</div>
             )}
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-4">
            <Button variant="outline"><BadgePercent className="mr-2"/> Offers</Button>
            <Button variant="outline"><HelpCircle className="mr-2"/> Help</Button>
            <Button variant="outline"><GitCompareArrows className="mr-2"/> Compare</Button>
        </div>

        {/* Banner 2 */}
        <Card className="aspect-[16/6] w-full overflow-hidden relative bg-muted">
             {getBannerUrl('banner2') ? (
                <Image src={getBannerUrl('banner2')!} alt="Promotional Banner 2" fill className="object-cover"/>
             ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Banner 2</div>
             )}
        </Card>

        {/* The rest of the UI will go here in the next steps */}
    </div>
  );
}
