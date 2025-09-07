
import { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Cors from 'cors';

const cors = Cors({
  methods: ['GET', 'HEAD'],
});

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, cors);

  if (req.method === 'GET') {
    try {
      const configDocRef = doc(db, 'secure_configs', 'api_keys');
      const docSnap = await getDoc(configDocRef);

      if (docSnap.exists() && docSnap.data().razorpay_key_id) {
        res.status(200).json({ keyId: docSnap.data().razorpay_key_id });
      } else {
        res.status(404).json({ error: 'Razorpay Key ID not found' });
      }
    } catch (error) {
      console.error('Error fetching Razorpay Key ID:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
