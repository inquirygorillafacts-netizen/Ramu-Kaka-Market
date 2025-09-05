
'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, AlertTriangle, Package, ShoppingBasket, PlusCircle, User, Truck, Star } from 'lucide-react';
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


export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryPersonnel, setDeliveryPersonnel] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRoleManagerOpen, setIsRoleManagerOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(() => {
    // Fetch users
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersList);
      const deliveryList = usersList.filter(u => u.roles.delivery);
      setDeliveryPersonnel(deliveryList);
    }, (err) => {
      console.error("Error fetching users:", err);
      setError("Failed to load user data.");
    });

    // Fetch products
    const productsQuery = query(collection(db, 'products'), orderBy('name'));
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsList);
    }, (err) => {
      console.error("Error fetching products:", err);
      setError("Failed to load product data.");
    });
    
    // Fetch orders
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
        } as Order;
      });
      setOrders(ordersList);
    }, (err) => {
      console.error("Error fetching orders:", err);
      setError("Failed to load order data.");
    });

    return { unsubscribeUsers, unsubscribeProducts, unsubscribeOrders };
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
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
    if (!isAdmin) {
        setLoading(false);
        return;
    };

    setLoading(true);
    const { unsubscribeUsers, unsubscribeProducts, unsubscribeOrders } = fetchData();
    setLoading(false);

    return () => {
      unsubscribeUsers();
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, [isAdmin, fetchData]);

  const handleManageRolesClick = (user: UserProfile) => {
    setSelectedUser(user);
    setIsRoleManagerOpen(true);
  }

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
        });
        toast({ title: 'Success', description: 'Delivery personnel assigned.' });
      } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not assign delivery personnel.' });
      }
  }


  const renderRoles = (roles: UserProfile['roles']) => {
    return Object.entries(roles).map(([role, value]) => {
      let roleId = '';
      if (role === 'admin' && typeof value === 'object' && value?.adminId) roleId = `(${value.adminId})`;
      if (role === 'delivery' && typeof value === 'object' && value?.deliveryId) roleId = `(${value.deliveryId})`;
      
      const variant = role === 'admin' ? 'destructive' : role === 'delivery' ? 'secondary' : 'default';

      return (
        <Badge key={role} variant={variant} className="mr-1 capitalize">
          {role} {roleId}
        </Badge>
      );
    });
  }

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


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Verifying access & loading dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
     return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground">You must be an administrator to view this page.</p>
        <Button onClick={() => router.push('/role-selection')}>Back to Gates</Button>
      </div>
    );
  }


  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h1 className="text-3xl font-bold font-headline text-primary">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2 font-highlight text-lg">Oversee users, products, and orders.</p>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">
            <ShoppingBasket className="mr-2 h-4 w-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-2 h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" /> Users
          </TabsTrigger>
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
                    <TableHead>Items</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Assign Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.customerName}</TableCell>
                      <TableCell>₹{order.total.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{order.items.length}</TableCell>
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

      </Tabs>
      
      {selectedUser && (
        <RoleManager
            user={selectedUser}
            isOpen={isRoleManagerOpen}
            onOpenChange={setIsRoleManagerOpen}
            onSave={handleRolesUpdate}
        />
      )}
      <ProductForm 
        isOpen={isProductFormOpen}
        onOpenChange={setIsProductFormOpen}
        onProductAdded={() => { /* Can be used to refetch if not using snapshots */ }}
      />
    </div>
  );
}
