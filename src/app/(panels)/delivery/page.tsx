
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Truck, Package, CheckCircle, Clock, PackageCheck, AlertTriangle, MapPin, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { onSnapshot, query, where, collection, doc, updateDoc, getDoc, Timestamp, orderBy } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Order } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserProfile } from "@/app/(panels)/admin/RoleManager";
import Link from 'next/link';
import OrderDetails from "@/components/OrderDetails";

export default function DeliveryPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deliveryProfile, setDeliveryProfile] = useState<UserProfile | null>(null);
  const [tasks, setTasks] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().roles.delivery) {
          setDeliveryProfile({id: user.uid, ...userDoc.data()} as UserProfile);
        } else {
          setError("You do not have delivery permissions.");
          setLoading(false);
        }
      } else {
        setError("You are not logged in.");
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!deliveryProfile) return;
    setLoading(true);
    const q = query(
      collection(db, 'orders'),
      where('deliveryId', '==', deliveryProfile.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
        } as Order;
      });
      setTasks(ordersList);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching tasks:", err);
      setError("Failed to load delivery tasks.");
      setLoading(false);
    });

    return () => unsubscribe();

  }, [deliveryProfile]);

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { 
        status: status,
        customerHasViewedUpdate: false,
      });
      toast({ title: 'Success', description: 'Order status updated successfully.' });
    } catch (err) {
      console.error("Error updating status:", err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  }

  const getMapUrl = (lat: string, lng: string) => `https://www.google.com/maps?q=${lat},${lng}`;

  const pendingTasks = tasks.filter(t => t.status === 'Assigned').length;
  const inTransitTasks = tasks.filter(t => t.status === 'Out for Delivery').length;
  const completedTasks = tasks.filter(t => t.status === 'Delivered').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading your delivery dashboard...</p>
      </div>
    );
  }
  
  if (error) {
     return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-bold">Access Issue</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-card p-6 rounded-lg shadow-sm border">
        <h1 className="text-3xl font-bold font-headline text-primary">Delivery Dashboard</h1>
        <p className="text-muted-foreground mt-2 font-highlight text-lg">Manage and track all your assigned deliveries.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Pick-up</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">Orders assigned to you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inTransitTasks}</div>
            <p className="text-xs text-muted-foreground">On the way to customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Deliveries</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground">Successfully delivered today</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Delivery Tasks</CardTitle>
          <CardDescription>Your current and upcoming delivery assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center text-muted-foreground/50 space-y-4 h-64 border-2 border-dashed rounded-lg">
              <Truck className="w-16 h-16"/>
              <p>You have no assigned deliveries. Check back later!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <Card key={task.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">Order for {task.customerName}</CardTitle>
                                <CardDescription>ID: {task.id.substring(0,7)}... | Placed: {task.createdAt.toLocaleDateString()}</CardDescription>
                                <div className="text-sm text-muted-foreground mt-2">{task.customerAddress}, {task.customerPincode}</div>
                                <div className="text-sm text-muted-foreground">{task.customerMobile}</div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                               <Badge variant={task.status === 'Delivered' ? 'default' : 'secondary'} className={task.status === 'Delivered' ? 'bg-green-500' : ''}>{task.status}</Badge>
                               {task.mapLat && task.mapLng && (
                                 <Button asChild variant="outline" size="sm" className="mt-2">
                                     <Link href={getMapUrl(task.mapLat, task.mapLng)} target="_blank">
                                        <MapPin className="mr-2 h-4 w-4"/>
                                        View Map
                                     </Link>
                                 </Button>
                               )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" size="sm" onClick={() => handleViewDetails(task)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                        </Button>
                    </CardContent>
                    <CardFooter className="bg-muted/50 p-4 flex justify-between items-center">
                        <p className="font-bold text-primary">Total: ₹{task.total.toFixed(2)}</p>
                        {task.status !== 'Delivered' && (
                             <Select onValueChange={(value) => handleStatusUpdate(task.id, value)} defaultValue={task.status}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Update Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Out for Delivery">Out for Delivery</SelectItem>
                                    <SelectItem value="Delivered">Delivered</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <OrderDetails isOpen={isDetailsOpen} onOpenChange={setIsDetailsOpen} order={selectedOrder} />
    </div>
  );
}
