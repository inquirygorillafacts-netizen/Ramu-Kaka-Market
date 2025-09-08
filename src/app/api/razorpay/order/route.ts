
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

let keyCache: { key_id: string; key_secret: string } | null = null;

async function getRazorpayKeys() {
  if (keyCache) {
    return keyCache;
  }
  try {
    const configDocRef = doc(db, 'secure_configs', 'api_keys');
    const docSnap = await getDoc(configDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.razorpay_key_id && data.razorpay_key_secret) {
        keyCache = {
          key_id: data.razorpay_key_id,
          key_secret: data.razorpay_key_secret,
        };
        // Optional: In a real app, you might want to expire this cache.
        // setTimeout(() => { keyCache = null; }, 3600 * 1000); 
        return keyCache;
      }
    }
    throw new Error('Razorpay keys not found in Firestore.');
  } catch (error) {
    console.error('Error fetching Razorpay keys from Firestore:', error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { key_id, key_secret } = await getRazorpayKeys();

    const razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret,
    });
    
    const { amount } = await req.json();

    const options = {
      amount: amount,
      currency: 'INR',
      receipt: `receipt_order_${new Date().getTime()}`,
    };
    
    const order = await razorpay.orders.create(options);
    
    return NextResponse.json({ order });

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: 'Error creating order', details: error.message }, { status: 500 });
  }
}
    