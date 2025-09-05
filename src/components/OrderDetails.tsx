'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Order, CartItem } from '@/lib/types';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { CreditCard, Truck, Wallet } from 'lucide-react';

interface OrderDetailsProps {
  order: Order | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function OrderDetails({ order, isOpen, onOpenChange }: OrderDetailsProps) {
  if (!order) return null;

  const getPaymentMethodBadge = (method: 'COD' | 'Online' | undefined) => {
    if (method === 'Online') {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600">
          <CreditCard className="mr-1.5 h-3 w-3" />
          Online
        </Badge>
      );
    }
    if (method === 'COD') {
      return (
        <Badge variant="secondary">
          <Wallet className="mr-1.5 h-3 w-3" />
          COD
        </Badge>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
          <DialogDescription>
            Order ID: #{order.id.substring(0, 7).toUpperCase()}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4 space-y-4">
          <div className="space-y-3">
            <h4 className="font-semibold">Items</h4>
            {order.items.map((item: CartItem) => (
              <div key={item.id} className="flex items-start gap-4">
                <Image
                  src={item.images[0]}
                  alt={item.name}
                  width={64}
                  height={64}
                  className="rounded-md object-cover aspect-square"
                />
                <div className="flex-grow">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    ₹{(item.discountPrice ?? item.price).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">per {item.unitQuantity} {item.unit}</p>
                </div>
              </div>
            ))}
          </div>
          <Separator />
          <div className="space-y-3">
             <h4 className="font-semibold">Summary</h4>
             <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Payment Method</span>
                {getPaymentMethodBadge(order.paymentMethod)}
             </div>
             <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-bold text-lg">₹{order.total.toFixed(2)}</span>
             </div>
             {order.deliveryPersonName && (
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Delivery By</span>
                    <Badge variant="outline" className="gap-1.5">
                        <Truck className="h-3 w-3" />
                        {order.deliveryPersonName}
                    </Badge>
                </div>
             )}
          </div>
           <Separator />
           <div className="space-y-2">
             <h4 className="font-semibold">Delivery Address</h4>
             <p className="text-sm text-muted-foreground">
                {order.customerName}<br/>
                {order.customerAddress}<br/>
                {order.customerPincode}<br/>
                Mobile: {order.customerMobile}
             </p>
           </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
