
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, where, orderBy, Timestamp, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, Order, CartItem, ProductCategory, UserProfile } from '@/lib/types';
import { Loader2, Package, ShoppingBag, History, Star, Soup, Apple, Beef, Wheat, Bell, User as UserIcon, Search, BadgePercent, HelpCircle, GitCompareArrows } from 'lucide-react';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface Banner {
  id: string;
  imageUrl: string;
  active: boolean;
}

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
  const [notifications, setNotifications] = useState<Order[]>([]);
  const { toast } = useToast();

  useEffect(() => {
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

    const prodQuery = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(prodQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setLoading(false);
    });

    const bannersQuery = query(collection(db, 'banners'), where('active', '==', true));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
        setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner)));
    });

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
    if (!currentUser) return;
    const q = query(
        collection(db, 'orders'),
        where('customerId', '==', currentUser.uid),
        where('customerHasViewedUpdate', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const unseenOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setNotifications(unseenOrders);
    });

    return () => unsubscribe();
  }, [currentUser]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('ramukaka_cart', JSON.stringify(cart));
    }
  }, [cart]);

  const handleClearNotifications = async () => {
    if (notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notif => {
        const orderRef = doc(db, 'orders', notif.id);
        batch.update(orderRef, { customerHasViewedUpdate: true });
    });
    await batch.commit();
    setNotifications([]);
  };

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
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Avatar>
                    <AvatarImage src={userProfile?.photoUrl || ''} alt={userProfile?.name || 'User'} />
                    <AvatarFallback>{getInitials(userProfile?.name || 'U')}</AvatarFallback>
                </Avatar>
            </div>
            <h1 className="font-bold text-lg font-headline text-primary">Ramu Kaka Market</h1>
            <Popover onOpenChange={(open) => !open && handleClearNotifications()}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-6 w-6"/>
                    {notifications.length > 0 && (
                      <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center ring-2 ring-background">
                          {notifications.length}
                      </span>
                    )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Notifications</h4>
                    <p className="text-sm text-muted-foreground">
                      Recent updates on your orders.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    {notifications.length > 0 ? notifications.map(notif => (
                       <div key={notif.id} className="text-sm">
                           <p>Order <span className="font-semibold">#{notif.id.substring(0, 7)}...</span> is now <span className="font-semibold text-primary">{notif.status}</span>.</p>
                           <Separator className="my-2"/>
                       </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">No new notifications.</p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
                <Image src={getBannerUrl('banner1')!} alt="Promotional Banner 1" width={600} height={300} className="object-cover w-full h-full"/>
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
    </div>
  );
}
