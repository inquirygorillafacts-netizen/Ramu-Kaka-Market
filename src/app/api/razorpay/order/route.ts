
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const configDocRef = doc(db, 'secure_configs', 'api_keys');
    const docSnap = await getDoc(configDocRef);

    if (!docSnap.exists()) {
        throw new Error('API key document not found in Firestore.');
    }
    
    const keys = docSnap.data();
    if (!keys.razorpay_key_id || !keys.razorpay_key_secret) {
        throw new Error('Razorpay keys not found in Firestore document.');
    }

    const razorpay = new Razorpay({
      key_id: keys.razorpay_key_id,
      key_secret: keys.razorpay_key_secret,
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
    
