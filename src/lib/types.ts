
export interface UserProfile {
    id: string;
    name: string;
    email: string | null;
    roles: { [key: string]: any };
    photoUrl?: string;
  }
  
  export interface Rating {
    points: number;
    count: number;
  }

  export interface Product {
    id: string;
    name: string;
    price: number;
    images: string[];
    unit: 'kg' | 'gram' | 'piece' | 'litre';
    keywords?: string[];
    discountPrice?: number | null;
    rating?: Rating;
  }
  
  export interface CartItem extends Product {
    quantity: number;
  }
  
  export interface Order {
    id: string;
    customerId: string;
    customerName: string;
    items: CartItem[];
    total: number;
    status: 'Pending' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
    createdAt: Date;
    deliveryId?: string;
    deliveryPersonName?: string;
  }
  