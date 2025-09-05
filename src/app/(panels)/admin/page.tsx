
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot, query, orderBy, where, Timestamp, setDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, AlertTriangle, Package, ShoppingBasket, PlusCircle, User, Truck, Star, Image as ImageIcon, Upload, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import RoleManager, { UserProfile } from './RoleManager';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductForm from './ProductForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Product, Order } from '@/lib/types';
import NextImage from 'next/image';
import Link from 'next/link';

const IMGBB_API_KEY = '43d1267c74925ed8af33485644bfaa6b';

interface Banner {
    id: string;
    imageUrl: string;
    active: boolean;
}

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
          toast({ title: 'Success', description: `Banner updated.` });
        } catch (error: any) {
          toast({ variant: 'destructive', title: 'Database Error', description: 'Could not save banner to database.' });
        }
      }
      setUploadingBanner(null);
    }
  };
  
  const handleManageRolesClick = (user: UserProfile) => { setSelectedUser(user); setIsRoleManagerOpen(true); };
  
  const handleRolesUpdate = async (userId: string, newRoles: UserProfile['roles']) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { roles: newRoles });
      toast({
        title: "Success",
        description: "User roles updated successfully.",
      });
    } catch (error: any) {
      console.error("Error updating roles:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not update user roles.",
      });
    }
  }
  
  const handleAssignDelivery = async (orderId: string, deliveryId: string) => {
      const deliveryUser = deliveryPersonnel.find(d => d.id === deliveryId);
      if (!deliveryUser) {
          toast({ variant: 'destructive', title: 'Error', description: 'Selected delivery personnel not found.' });
          return;
      }
      try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            deliveryId: deliveryId,
            status: 'Assigned',
            deliveryPersonName: deliveryUser.name,
            customerHasViewedUpdate: false,
        });
        toast({ title: 'Success', description: 'Delivery personnel assigned.' });
      } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not assign delivery personnel.' });
      }
  }
  
  const getMapUrl = (lat: string, lng: string) => `https://www.google.com/maps?q=${lat},${lng}`;

  const renderRoles = (roles: UserProfile['roles']) => Object.entries(roles).map(([role, value]) => <Badge key={role} variant={role === 'admin' ? 'destructive' : 'secondary'} className="mr-1 capitalize">{role}</Badge>);
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
          <TabsTrigger value="banners"><ImageIcon className="mr-2 h-4 w-4" />Banner</TabsTrigger>
        </TabsList>
        
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order Management</CardTitle>
              <CardDescription>View and manage all incoming orders.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Assign Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-sm text-muted-foreground">{order.customerMobile}</div>
                      </TableCell>
                      <TableCell>₹{order.total.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                         {order.mapLat && order.mapLng ? (
                           <Button asChild variant="outline" size="sm">
                             <Link href={getMapUrl(order.mapLat, order.mapLng)} target="_blank">
                               <MapPin className="mr-2 h-4 w-4" />
                               View on Map
                             </Link>
                           </Button>
                         ) : (
                           <span className="text-muted-foreground text-xs">{order.customerAddress}</span>
                         )}
                      </TableCell>
                      <TableCell>{order.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell>
                        {order.status === 'Pending' ? (
                          <Select onValueChange={(value) => handleAssignDelivery(order.id, value)}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select Delivery" />
                            </SelectTrigger>
                            <SelectContent>
                              {deliveryPersonnel.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4 text-muted-foreground" />
                            <span>{order.deliveryPersonName}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="products">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Product Management</CardTitle>
                <CardDescription>Add, view, or manage your products.</CardDescription>
              </div>
              <Button onClick={() => setIsProductFormOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Keywords</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map(product => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.images && product.images[0] ? (
                          <NextImage src={product.images[0]} alt={product.name} width={48} height={48} className="w-12 h-12 object-cover rounded-md" />
                        ) : <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center text-muted-foreground">?</div> }
                      </TableCell>
                      <TableCell className="font-medium">{product.name} <span className="text-muted-foreground text-xs">({product.unit})</span></TableCell>
                      <TableCell><Badge variant="outline">{product.category}</Badge></TableCell>
                      <TableCell>
                        {product.discountPrice ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-base">₹{product.discountPrice.toFixed(2)}</span>
                            <span className="line-through text-muted-foreground text-xs">₹{product.price.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-base">₹{product.price.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {product.rating && product.rating.count > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                            <span className="font-bold">{product.rating.points.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({product.rating.count})</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {product.keywords?.map(kw => <Badge key={kw} variant="secondary">{kw}</Badge>)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-6 h-6" />
                <span>All Users</span>
              </CardTitle>
              <CardDescription>A list of all users in the system. You can manage their roles here.</CardDescription>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="text-destructive text-center h-64 flex items-center justify-center">
                  <p>{error}</p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{renderRoles(user.roles)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => handleManageRolesClick(user)}>Manage Roles</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="banners">
            <Card>
                <CardHeader>
                    <CardTitle>Banner Management</CardTitle>
                    <CardDescription>Upload an image for the main promotional banner on the customer page.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-1 gap-6">
                    {['banner1'].map(bannerId => (
                        <Card key={bannerId}>
                            <CardHeader>
                                <CardTitle className="capitalize">Main Banner</CardTitle>
                                <CardDescription>This banner appears at the top of the customer page.</CardDescription>
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
