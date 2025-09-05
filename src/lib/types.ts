

export interface UserProfile {
    id: string;
    name: string;
    email: string | null;
    roles: { [key: string]: any };
    photoUrl?: string;
    mobile?: string;
    village?: string;
    address?: string;
    pincode?: string;
    mapIp1?: string;
    mapIp2?: string;
    paymentMethod?: 'COD' | 'Online';
  }
  
  export interface Rating {
    points: number;
    count: number;
  }

  export type ProductCategory = 'Vegetables' | 'Fruits' | 'Grocery' | 'Cafe';

  export interface Product {
    id: string;
    name: string;
    price: number;
    images: string[];
    unit: 'kg' | 'gram' | 'piece' | 'litre';
    category: ProductCategory;
    keywords?: string[];
    discountPrice?: number | null;
    rating?: Rating;
  }
  
  export interface CartItem extends Product {
    quantity: number;
  }
  
  export interface Order {
    id:string;
    customerId: string;
    customerName: string;
    items: CartItem[];
    total: number;
    status: 'Pending' | 'Assigned' | 'Out for Delivery' | 'Delivered' | 'Cancelled';
    createdAt: Date;
    deliveryId?: string;
    deliveryPersonName?: string;
    customerHasViewedUpdate?: boolean;
    paymentMethod?: 'COD' | 'Online';
    paymentId?: string;
    customerAddress?: string;
    customerPincode?: string;
    customerMobile?: string;
  }

    
