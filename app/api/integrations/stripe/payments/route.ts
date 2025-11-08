/**
 * GET /api/integrations/stripe/payments - Get Stripe payments
 * POST /api/integrations/stripe/payments - Save or sync Stripe payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const payments = await prisma.stripe_Payments.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.stripe_Payments.count();

    return NextResponse.json({
      payments,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      stripePaymentId,
      localInvoiceId,
      amount,
      currency,
      status,
      paymentMethod,
      userId,
    } = body;

    if (!stripePaymentId) {
      return NextResponse.json(
        { error: 'Missing Stripe payment ID' },
        { status: 400 }
      );
    }

    // Check if payment already exists
    const existingPayment = await prisma.stripe_Payments.findUnique({
      where: { stripe_payment_id: stripePaymentId },
    });

    if (existingPayment) {
      // Update existing payment
      const updated = await prisma.stripe_Payments.update({
        where: { stripe_payment_id: stripePaymentId },
        data: {
          status,
          amount,
          currency,
          payment_method: paymentMethod,
        },
      });
      return NextResponse.json(
        { payment: updated, message: 'Payment updated' },
        { status: 200 }
      );
    }

    // Create new payment
    const payment = await prisma.stripe_Payments.create({
      data: {
        stripe_payment_id: stripePaymentId,
        local_invoice_id: localInvoiceId,
        amount,
        currency,
        status,
        payment_method: paymentMethod,
      },
    });

    return NextResponse.json(
      { payment, message: 'Payment created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
