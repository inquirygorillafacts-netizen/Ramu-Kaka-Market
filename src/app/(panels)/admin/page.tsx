
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot, query, orderBy, where, Timestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, AlertTriangle, Package, ShoppingBasket, PlusCircle, User, Truck, Star, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import RoleManager, { UserProfile } from './RoleManager';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductForm from './ProductForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, Order, Banner } from '@/lib/types';
import NextImage from 'next/image';

const IMGBB_API_KEY = '43d1267c74925ed8af33485644bfaa6b';

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [deliveryPersonnel, setDeliveryPersonnel] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const [uploadingBanner, setUploadingBanner] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    // Users
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersList);
      setDeliveryPersonnel(usersList.filter(u => u.roles.delivery));
    });

    // Products
    const productsQuery = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsList);
    });
    
    // Orders
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as Timestamp).toDate() } as Order));
      setOrders(ordersList);
    });
    
    // Banners
    const bannersQuery = query(collection(db, 'banners'));
    const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
        const bannerList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Banner));
        setBanners(bannerList);
    });

    return { unsubscribeUsers, unsubscribeProducts, unsubscribeOrders, unsubscribeBanners };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().roles.admin) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push('/role-selection');
        }
      } else {
        router.push('/auth');
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    setLoading(true);
    const { unsubscribeUsers, unsubscribeProducts, unsubscribeOrders, unsubscribeBanners } = fetchData();
    setLoading(false);
    return () => {
      unsubscribeUsers();
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeBanners();
    };
  }, [isAdmin, fetchData]);

  const handleImageUpload = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) return result.data.url;
      throw new Error(result.error.message || 'Image upload failed');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Image Upload Failed', description: error.message });
      return null;
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>, bannerId: string) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadingBanner(bannerId);
      const imageUrl = await handleImageUpload(file);
      if (imageUrl) {
        try {
          await setDoc(doc(db, 'banners', bannerId), { id: bannerId, imageUrl, active: true }, { merge: true });
          toast({ title: 'Success', description: `Banner ${bannerId} updated.` });
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Database Error', description: 'Could not save banner to database.' });
        }
      }
      setUploadingBanner(null);
    }
  };
  
  // Other handlers like manage roles, assign delivery etc.
  const handleManageRolesClick = (user: UserProfile) => { setSelectedUser(user); setIsRoleManagerOpen(true); };
  const handleRolesUpdate = async (userId: string, newRoles: UserProfile['roles']) => { /* ... */ };
  const handleAssignDelivery = async (orderId: string, deliveryId: string) => { /* ... */ };
  const renderRoles = (roles: UserProfile['roles']) => Object.entries(roles).map(([role, value]) => <Badge key={role} variant={role === 'admin' ? 'destructive' : 'secondary'} className="mr-1 capitalize">{role}</Badge>);
  const getStatusBadge = (status: string) => <Badge>{status}</Badge>;


  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  if (!isAdmin) return <div className="flex flex-col items-center justify-center h-64"><AlertTriangle className="w-16 h-16 text-destructive" /><h2 className="text-2xl">Access Denied</h2></div>;

  const getBannerUrl = (id: string) => banners.find(b => b.id === id)?.imageUrl;

  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h1 className="text-3xl font-bold font-headline text-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2 font-highlight text-lg">Oversee users, products, orders, and site content.</p>
      </div>

      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="orders"><ShoppingBasket className="mr-2 h-4 w-4" />Orders</TabsTrigger>
          <TabsTrigger value="products"><Package className="mr-2 h-4 w-4" />Products</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" />Users</TabsTrigger>
          <TabsTrigger value="banners"><ImageIcon className="mr-2 h-4 w-4" />Banners</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders">{/* Orders Table */}</TabsContent>
        <TabsContent value="products">{/* Products Table with Add button */}</TabsContent>
        <TabsContent value="users">{/* Users Table */}</TabsContent>
        <TabsContent value="banners">
            <Card>
                <CardHeader>
                    <CardTitle>Banner Management</CardTitle>
                    <CardDescription>Upload images for the two main promotional banners on the customer page.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    {['banner1', 'banner2'].map(bannerId => (
                        <Card key={bannerId}>
                            <CardHeader>
                                <CardTitle className="capitalize">Banner {bannerId.slice(-1)}</CardTitle>
                                <CardDescription>This is the {bannerId.slice(-1) === '1' ? 'top' : 'bottom'} banner.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="aspect-video w-full rounded-md border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden">
                                {uploadingBanner === bannerId ? (
                                    <Loader2 className="w-8 h-8 animate-spin text-primary"/>
                                ) : getBannerUrl(bannerId) ? (
                                    <NextImage src={getBannerUrl(bannerId)!} alt={bannerId} width={520} height={292} className="object-cover w-full h-full"/>
                                ) : (
                                    <div className="text-center text-muted-foreground">
                                        <ImageIcon className="mx-auto h-12 w-12"/>
                                        <p>No Image</p>
                                    </div>
                                )}
                                </div>
                                <Button asChild className="w-full cursor-pointer">
                                  <label>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Image
                                    <input type="file" className="sr-only" accept="image/*" onChange={(e) => handleBannerUpload(e, bannerId)} disabled={!!uploadingBanner}/>
                                  </label>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
      
      {selectedUser && <RoleManager user={selectedUser} isOpen={isRoleManagerOpen} onOpenChange={setIsRoleManagerOpen} onSave={handleRolesUpdate} />}
      <ProductForm isOpen={isProductFormOpen} onOpenChange={setIsProductFormOpen} onProductAdded={() => {}} />
    </div>
  );
}
