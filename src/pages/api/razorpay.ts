
import { NextApiRequest, NextApiResponse } from 'next';
import Razorpay from 'razorpay';
import Cors from 'cors';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Initialize the cors middleware
const cors = Cors({
  methods: ['POST', 'GET', 'HEAD'],
});

// Helper to fetch keys from Firestore
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
        return keyCache;
      }
    }
    throw new Error('Razorpay keys not found in Firestore.');
  } catch (error) {
    console.error('Error fetching Razorpay keys from Firestore:', error);
    throw error;
  }
}

// Helper method to wait for a middleware to execute before continuing
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the middleware
  await runMiddleware(req, res, cors);

  if (req.method === 'POST') {
    try {
      const { key_id, key_secret } = await getRazorpayKeys();

      const razorpay = new Razorpay({
        key_id: key_id,
        key_secret: key_secret,
      });

      const { amount } = req.body;
      const options = {
        amount: amount,
        currency: 'INR',
        receipt: `receipt_order_${new Date().getTime()}`,
      };
      
      const order = await razorpay.orders.create(options);
      res.status(200).json({ order });

    } catch (error) {
      res.status(500).json({ error: 'Error creating order' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
