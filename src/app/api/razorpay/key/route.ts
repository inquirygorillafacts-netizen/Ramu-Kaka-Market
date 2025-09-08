
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensures the function is always run dynamically

export async function GET() {
  try {
    const configDocRef = doc(db, 'secure_configs', 'api_keys');
    const docSnap = await getDoc(configDocRef);

    if (docSnap.exists() && docSnap.data().razorpay_key_id) {
      return NextResponse.json({ keyId: docSnap.data().razorpay_key_id });
    } else {
      return NextResponse.json({ error: 'Razorpay Key ID not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching Razorpay Key ID:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
    