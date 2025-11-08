/**
 * GET /api/integrations/paypal/payments - Get PayPal payments
 * POST /api/integrations/paypal/payments - Save or sync PayPal payment
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

    const payments = await prisma.paypal_Payments.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.paypal_Payments.count();

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
      paypalPaymentId,
      localInvoiceId,
      amount,
      currency,
      status,
      payerEmail,
      userId,
    } = body;

    if (!paypalPaymentId) {
      return NextResponse.json(
        { error: 'Missing PayPal payment ID' },
        { status: 400 }
      );
    }

    // Check if payment already exists
    const existingPayment = await prisma.paypal_Payments.findUnique({
      where: { paypal_payment_id: paypalPaymentId },
    });

    if (existingPayment) {
      // Update existing payment
      const updated = await prisma.paypal_Payments.update({
        where: { paypal_payment_id: paypalPaymentId },
        data: {
          status,
          amount,
          currency,
          payer_email: payerEmail,
        },
      });
      return NextResponse.json(
        { payment: updated, message: 'Payment updated' },
        { status: 200 }
      );
    }

    // Create new payment
    const payment = await prisma.paypal_Payments.create({
      data: {
        paypal_payment_id: paypalPaymentId,
        local_invoice_id: localInvoiceId,
        amount,
        currency,
        status,
        payer_email: payerEmail,
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
