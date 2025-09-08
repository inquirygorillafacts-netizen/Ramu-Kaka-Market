
import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const configDocRef = doc(db, 'secure_configs', 'api_keys');
    const docSnap = await getDoc(configDocRef);

    if (!docSnap.exists()) {
      throw new Error('API Keys document not found in Firestore.');
    }

    const keys = docSnap.data();
    const keyId = keys.razorpay_key_id;

    if (!keyId) {
      throw new Error('Razorpay Key ID not found in Firestore document.');
    }

    return NextResponse.json({ keyId });
  } catch (error: any) {
    console.error('API Error fetching Razorpay key:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
