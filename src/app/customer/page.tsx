
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, addDoc, where, orderBy, Timestamp, doc, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Product, Order, CartItem, UserProfile, ProductCategory } from '@/lib/types';
import { Loader2, Bell, Search, BadgePercent, HelpCircle, GitCompareArrows, Heart, ShoppingBasket } from 'lucide-react';
import Image from 'next/image';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function CustomerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [banners, setBanners] = useState<{ id: string; imageUrl: string; active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Order[]>([]);
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');


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
      setLoading(false);
    });

    const bannersQuery = query(collection(db, 'banners'), where('active', '==', true));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
        setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; imageUrl: string; active: boolean })));
    });

    const savedCart = localStorage.getItem('ramukaka_cart');
    if (savedCart) setCart(JSON.parse(savedCart));

    const savedFavorites = localStorage.getItem('ramukaka_favorites');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites).map((p: Product) => p.id));


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
    }, (error) => {
        console.error("Notification listener error:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);


  const updateCart = (newCart: CartItem[]) => {
      setCart(newCart);
      localStorage.setItem('ramukaka_cart', JSON.stringify(newCart));
  }

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
      e.preventDefault(); // Stop navigation when clicking the button
      e.stopPropagation();
      const newCart = [...cart];
      const existingItem = newCart.find(item => item.id === product.id);
      if (existingItem) {
          existingItem.quantity += 1;
      } else {
          newCart.push({ ...product, quantity: 1 });
      }
      updateCart(newCart);
      toast({
          title: 'Added to Tokri!',
          description: `${product.name} has been added to your tokri.`
      })
  }

  const toggleFavorite = (e: React.MouseEvent, product: Product) => {
      e.preventDefault(); // Stop navigation when clicking the button
      e.stopPropagation();
      const currentFavorites: Product[] = JSON.parse(localStorage.getItem('ramukaka_favorites') || '[]');
      const isFavorite = favorites.includes(product.id);
      let updatedFavorites: Product[];
      
      if (isFavorite) {
          updatedFavorites = currentFavorites.filter(fav => fav.id !== product.id);
          toast({ title: "Removed from Favorites" });
      } else {
          updatedFavorites = [...currentFavorites, product];
          toast({ title: "Added to Favorites!" });
      }
      localStorage.setItem('ramukaka_favorites', JSON.stringify(updatedFavorites));
      setFavorites(updatedFavorites.map(p => p.id));
  };


  const handleClearNotifications = async () => {
    if (notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notif => {
        const orderRef = doc(db, 'orders', notif.id);
        batch.update(orderRef, { customerHasViewedUpdate: true });
    });
    try {
        await batch.commit();
        setNotifications([]);
    } catch(err) {
        console.error("Failed to clear notifications:", err)
        toast({variant: 'destructive', title: 'Error', description: 'Could not clear notifications.'})
    }
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => selectedCategory === 'All' || p.category === selectedCategory)
      .filter(p => 
        searchQuery === '' || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.keywords?.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()))
      );
  }, [products, selectedCategory, searchQuery]);


  const getInitials = (name: string = "") => name.split(' ').map(n => n[0]).join('').toUpperCase();
  const getBannerUrl = (id: string) => banners.find(b => b.id === id)?.imageUrl;

  return (
    <div className="p-4 md:p-6 space-y-6">
        <header className="animate-fade-in-down">
          <div className="bg-card p-4 rounded-xl shadow-sm flex justify-between items-center">
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
            <Sheet onOpenChange={(open) => !open && handleClearNotifications()}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full w-12 h-12">
                    <Bell className="h-6 w-6 text-foreground/80"/>
                    {notifications.length > 0 && (
                      <span className="absolute top-1 right-1 block h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center ring-2 ring-background">
                          {notifications.length}
                      </span>
                    )}
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Notifications</SheetTitle>
                  <SheetDescription>
                    Recent updates on your orders.
                  </SheetDescription>
                </SheetHeader>
                <Separator className="my-4"/>
                <div className="grid gap-2">
                  {notifications.length > 0 ? notifications.map(notif => (
                      <div key={notif.id} className="text-sm p-2 rounded-md hover:bg-muted">
                          <p>Order <span className="font-semibold">#{notif.id.substring(0, 7)}...</span> is now <span className="font-semibold text-primary">{notif.status}</span>.</p>
                      </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
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
            <Link href="/customer/help" className="flex flex-col items-center justify-center h-24 gap-2 rounded-xl bg-card shadow-sm border-2 border-transparent hover:border-primary hover:-translate-y-1 transition-transform duration-200 outline-none focus:ring-2 ring-ring ring-offset-2">
                <HelpCircle className="h-8 w-8 text-primary"/>
                <span className="text-sm font-semibold">Help</span>
            </Link>
            <Button variant="outline" className="flex flex-col h-24 gap-2 rounded-xl bg-card shadow-sm border-2 border-transparent hover:border-primary hover:-translate-y-1 transition-transform duration-200">
                <GitCompareArrows className="h-8 w-8 text-green-600"/>
                <span className="text-sm font-semibold">Compare</span>
            </Button>
        </div>

        <div className="space-y-4 animate-fade-in-up" style={{animationDelay: '400ms'}}>
            <h2 className="text-2xl font-bold font-headline">Shop by Category</h2>
             <Tabs defaultValue="All" value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as any)} className="w-full">
              <TabsList>
                <TabsTrigger value="All">All</TabsTrigger>
                <TabsTrigger value="Vegetables">Vegetables</TabsTrigger>
                <TabsTrigger value="Fruits">Fruits</TabsTrigger>
                <TabsTrigger value="Grocery">Grocery</TabsTrigger>
                <TabsTrigger value="Cafe">Cafe</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {loading ? (
                 <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                 </div>
            ): filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredProducts.map(product => (
                       <Link key={product.id} href={`/customer/product/${product.id}`} className="block group">
                        <div className="relative bg-card rounded-xl shadow-sm overflow-hidden border h-full flex flex-col">
                            <button 
                                onClick={(e) => toggleFavorite(e, product)}
                                className="absolute top-2 right-2 z-10 p-1.5 bg-background/70 backdrop-blur-sm rounded-full"
                            >
                                <Heart className={`w-5 h-5 transition-colors ${favorites.includes(product.id) ? 'text-destructive fill-destructive' : 'text-muted-foreground'}`}/>
                            </button>
                            
                            <div className="aspect-square overflow-hidden">
                                <Image 
                                    src={product.images[0]}
                                    alt={product.name} 
                                    width={200} 
                                    height={200} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            </div>

                            <div className="p-3 space-y-2 flex flex-col flex-grow">
                                <h3 className="font-semibold text-sm truncate flex-grow">{product.name}</h3>
                                <p className="text-xs text-muted-foreground">per {product.unitQuantity} {product.unit}</p>
                                <div className="flex justify-between items-center pt-1">
                                    <div className="font-bold text-base">
                                     {product.discountPrice ? (
                                        <div className="flex items-baseline gap-1.5">
                                            <span>₹{product.discountPrice.toFixed(2)}</span>
                                            <span className="text-sm line-through text-muted-foreground">₹{product.price.toFixed(2)}</span>
                                        </div>
                                     ) : `₹${product.price.toFixed(2)}`}
                                    </div>
                                </div>
                                 <Button className="w-full h-9" onClick={(e) => handleAddToCart(e, product)}>
                                   <ShoppingBasket className="w-4 h-4 mr-2"/>
                                   Add
                                 </Button>
                            </div>
                        </div>
                       </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-muted-foreground">
                    <p>No products found for "{searchQuery || selectedCategory}"</p>
                </div>
            )}
        </div>
    </div>
  );
}
