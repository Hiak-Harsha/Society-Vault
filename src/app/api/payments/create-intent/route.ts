import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: Request) {
  try {
    const userId = request.headers.get('x-user-id');
    const orgId = request.headers.get('x-user-org-id');

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, purpose } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // 1. Try Razorpay
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (razorpayKeyId && razorpayKeySecret) {
      const RazorpayClass = (await import('razorpay')).default;
      const razorpay = new RazorpayClass({
        key_id: razorpayKeyId,
        key_secret: razorpayKeySecret,
      });

      const amountInPaise = Math.round(amount * 100);
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
        notes: {
          userId,
          orgId,
          purpose: purpose || 'Lending Transaction',
        },
      });

      return NextResponse.json({
        isMock: false,
        gateway: 'razorpay',
        orderId: order.id,
        amount: order.amount,
        keyId: razorpayKeyId,
      });
    }

    // 2. Try Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (stripeSecretKey && stripePublishableKey) {
      const stripe = new Stripe(stripeSecretKey);
      const amountInSmallestUnit = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: 'inr',
        description: purpose || 'SocietyVault lending transaction',
        metadata: {
          userId,
          orgId,
          purpose: purpose || 'Lending Transaction',
        },
      });

      return NextResponse.json({
        isMock: false,
        gateway: 'stripe',
        clientSecret: paymentIntent.client_secret,
        publishableKey: stripePublishableKey,
      });
    }

    // 3. Fallback to Mock
    return NextResponse.json({ isMock: true });
  } catch (error) {
    console.error('Create payment intent error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create payment intent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
