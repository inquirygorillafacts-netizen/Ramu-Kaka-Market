
'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, where, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from '@/hooks/use-toast';
import { Order } from '@/lib/types';
import { Loader2, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { toast } = useToast();
  const router = useRouter();


  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        router.push('/auth');
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    const q = query(
        collection(db, 'orders'), 
        where('customerId', '==', currentUser.uid),
        orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const ordersData: Order[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            ordersData.push({
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as Timestamp).toDate(),
            } as Order);
        });
        const reversedOrders = ordersData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setOrders(reversedOrders);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching orders:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your orders.'});
        setLoading(false);
    });

    return () => unsubscribe();

  }, [currentUser, toast]);
  
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Pending': return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1"/>{status}</Badge>;
      case 'Assigned': return <Badge><Truck className="w-3 h-3 mr-1"/>{status}</Badge>;
      case 'Out for Delivery': return <Badge className="bg-blue-500 hover:bg-blue-600"><Truck className="w-3 h-3 mr-1 animate-pulse"/>{status}</Badge>;
      case 'Delivered': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1"/>{status}</Badge>;
      case 'Cancelled': return <Badge variant="destructive">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  }
  
  if (loading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
        <header className="animate-fade-in-down">
            <div className="flex items-center gap-4">
                <Package className="w-8 h-8 text-primary"/>
                <h1 className="text-3xl font-bold font-headline text-primary">My Orders</h1>
            </div>
            <p className="text-muted-foreground mt-1">Track your past and current orders.</p>
        </header>

        <div className="space-y-4 animate-fade-in-up">
            {orders.length === 0 ? (
                <div className="text-center py-20 flex flex-col items-center">
                    <Package className="w-24 h-24 text-muted-foreground/30 mb-4"/>
                    <h2 className="text-xl font-semibold">No Orders Yet</h2>
                    <p className="text-muted-foreground mt-2">You haven't placed any orders with us.</p>
                     <Button onClick={() => router.push('/customer')} className="mt-6">Start Shopping</Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map(order => (
                        <Card key={order.id} className="p-4 shadow-sm bg-card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-primary">Order ID: #{order.id.substring(0, 7).toUpperCase()}</p>
                                    <p className="text-sm text-muted-foreground">{order.createdAt.toLocaleString()}</p>
                                    <div className="mt-2">
                                        {getStatusBadge(order.status)}
                                        {order.deliveryPersonName && <Badge variant="outline" className="ml-2">Handled by: {order.deliveryPersonName}</Badge>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">₹{order.total.toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">{order.items.length} items</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}
