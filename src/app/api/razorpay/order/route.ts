
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

let keyCache: { key_id: string; key_secret: string } | null = null;

async function getRazorpayKeys() {
  // Simple in-memory cache for the duration of the serverless function execution
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
        return keyCache;
      }
    }
    throw new Error('Razorpay keys not found in Firestore.');
  } catch (error) {
    console.error('Error fetching Razorpay keys from Firestore:', error);
    throw error; // Re-throw the error to be caught by the main handler
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
    
    if (!order) {
        return NextResponse.json({ error: 'Order creation failed' }, { status: 500 });
    }
    
    return NextResponse.json({ order });

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: 'Error creating order', details: error.message }, { status: 500 });
  }
}
    
