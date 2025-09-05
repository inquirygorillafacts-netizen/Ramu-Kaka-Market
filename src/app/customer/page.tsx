'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, where, orderBy, Timestamp, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, Order, CartItem, UserProfile } from '@/lib/types';
import { Loader2, Bell, Search, BadgePercent, HelpCircle, GitCompareArrows } from 'lucide-react';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

export default function CustomerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<{ id: string; imageUrl: string; active: boolean }[]>([]);
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
      setLoading(false);
    });

    const prodQuery = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(prodQuery, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });

    const bannersQuery = query(collection(db, 'banners'), where('active', '==', true));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
        setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; imageUrl: string; active: boolean })));
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
    <div className="p-4 md:p-6 space-y-6 bg-background min-h-screen font-body">
        <header className="flex justify-between items-center animate-fade-in-down">
            <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={userProfile?.photoUrl || ''} alt={userProfile?.name || 'User'} data-ai-hint="person portrait" />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(userProfile?.name || 'U')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-muted-foreground">Welcome back,</p>
                  <h2 className="text-lg font-bold text-foreground">{userProfile?.name || 'Guest'}</h2>
                </div>
            </div>
            <Popover onOpenChange={(open) => !open && handleClearNotifications()}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full w-12 h-12">
                    <Bell className="h-6 w-6 text-foreground/80"/>
                    {notifications.length > 0 && (
                      <span className="absolute top-1 right-1 block h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center ring-2 ring-background">
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
                  <Separator/>
                  <div className="grid gap-2">
                    {notifications.length > 0 ? notifications.map(notif => (
                       <div key={notif.id} className="text-sm p-2 rounded-md hover:bg-muted">
                           <p>Order <span className="font-semibold">#{notif.id.substring(0, 7)}...</span> is now <span className="font-semibold text-primary">{notif.status}</span>.</p>
                       </div>
                    )) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
        </header>

        <div className="relative animate-fade-in-down" style={{animationDelay: '100ms'}}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"/>
            <Input 
              placeholder="Search for vegetables, fruits..." 
              className="pl-12 pr-4 py-6 text-base rounded-xl border-2 focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>

        <div className="aspect-[16/8] bg-card rounded-xl overflow-hidden shadow-sm animate-fade-in-up" style={{animationDelay: '200ms'}}>
            {getBannerUrl('banner1') ? (
                <Image src={getBannerUrl('banner1')!} alt="Promotional Banner 1" width={600} height={300} className="object-cover w-full h-full"/>
            ) : (
                <div className="flex items-center justify-center h-full bg-muted/50 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin"/>
                </div>
            )}
        </div>

        <div className="grid grid-cols-3 gap-3 text-center animate-fade-in-up" style={{animationDelay: '300ms'}}>
            <Button variant="outline" className="flex flex-col h-24 gap-2 rounded-xl bg-card shadow-sm border-2 border-transparent hover:border-primary hover:-translate-y-1 transition-transform duration-200">
                <BadgePercent className="h-8 w-8 text-destructive"/>
                <span className="text-sm font-semibold">Offers</span>
            </Button>
             <Button variant="outline" className="flex flex-col h-24 gap-2 rounded-xl bg-card shadow-sm border-2 border-transparent hover:border-primary hover:-translate-y-1 transition-transform duration-200">
                <HelpCircle className="h-8 w-8 text-primary"/>
                <span className="text-sm font-semibold">Help</span>
            </Button>
             <Button variant="outline" className="flex flex-col h-24 gap-2 rounded-xl bg-card shadow-sm border-2 border-transparent hover:border-primary hover:-translate-y-1 transition-transform duration-200">
                <GitCompareArrows className="h-8 w-8 text-green-600"/>
                <span className="text-sm font-semibold">Compare</span>
            </Button>
        </div>
    </div>
  );
}
