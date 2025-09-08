'use server';

import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Razorpay from 'razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { amount, currency, receipt } = await request.json();

    const configDocRef = doc(db, 'secure_configs', 'api_keys');
    const docSnap = await getDoc(configDocRef);

    if (!docSnap.exists()) {
      throw new Error('API Keys document not found in Firestore.');
    }

    const keys = docSnap.data();
    const keyId = keys.razorpay_key_id;
    const keySecret = keys.razorpay_key_secret;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay keys not found in Firestore document.');
    }

    const instance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: amount, // amount in the smallest currency unit
      currency: currency,
      receipt: receipt,
    };

    const order = await instance.orders.create(options);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('API Error creating Razorpay order:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
