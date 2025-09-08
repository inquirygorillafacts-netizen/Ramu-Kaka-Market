
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { z } from 'zod';

const orderRequestSchema = z.object({
  amount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsedBody = orderRequestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parsedBody.error.errors }, { status: 400 });
    }

    const { amount } = parsedBody.data;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error('Razorpay keys are not defined in environment variables.');
      return NextResponse.json({ error: 'Payment service is not configured.' }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency: 'INR',
      receipt: `receipt_order_${new Date().getTime()}`,
    };

    const order = await razorpay.orders.create(options);

    if (!order) {
      return NextResponse.json({ error: 'Failed to create Razorpay order.' }, { status: 500 });
    }
    
    // Send back only the necessary, non-sensitive information
    return NextResponse.json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: keyId, // Send public key to client
    });

  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }
}
