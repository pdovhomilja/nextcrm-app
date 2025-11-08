/**
 * POST /api/integrations/paypal/webhook - Handle PayPal webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventType = body.event_type;

    // Handle different event types
    switch (eventType) {
      case 'PAYMENT.SALE.COMPLETED':
        await handleSaleCompleted(body.resource);
        break;

      case 'PAYMENT.SALE.DENIED':
        await handleSaleDenied(body.resource);
        break;

      case 'PAYMENT.SALE.REFUNDED':
        await handleSaleRefunded(body.resource);
        break;

      case 'BILLING.SUBSCRIPTION.CREATED':
        await handleSubscriptionCreated(body.resource);
        break;

      case 'BILLING.SUBSCRIPTION.UPDATED':
        await handleSubscriptionUpdated(body.resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handleSubscriptionCancelled(body.resource);
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
        await handleCaptureCompleted(body.resource);
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        await handleCaptureDenied(body.resource);
        break;

      default:
        console.log(`Unhandled PayPal event type: ${eventType}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error handling PayPal webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleSaleCompleted(sale: any) {
  try {
    const payment = await prisma.paypal_Payments.findUnique({
      where: { paypal_payment_id: sale.id },
    });

    if (payment) {
      await prisma.paypal_Payments.update({
        where: { paypal_payment_id: sale.id },
        data: {
          status: 'COMPLETED',
        },
      });
    } else {
      await prisma.paypal_Payments.create({
        data: {
          paypal_payment_id: sale.id,
          amount: parseFloat(sale.amount?.total || '0'),
          currency: sale.amount?.currency || 'USD',
          status: 'COMPLETED',
          payer_email: sale.payer?.email,
        },
      });
    }

    console.log(`PayPal sale completed: ${sale.id}`);
  } catch (error) {
    console.error('Error handling sale completed:', error);
  }
}

async function handleSaleDenied(sale: any) {
  try {
    await prisma.paypal_Payments.upsert({
      where: { paypal_payment_id: sale.id },
      update: { status: 'FAILED' },
      create: {
        paypal_payment_id: sale.id,
        amount: parseFloat(sale.amount?.total || '0'),
        currency: sale.amount?.currency || 'USD',
        status: 'FAILED',
      },
    });

    console.log(`PayPal sale denied: ${sale.id}`);
  } catch (error) {
    console.error('Error handling sale denied:', error);
  }
}

async function handleSaleRefunded(sale: any) {
  try {
    await prisma.paypal_Payments.update({
      where: { paypal_payment_id: sale.id },
      data: {
        status: 'REFUNDED',
      },
    });

    console.log(`PayPal sale refunded: ${sale.id}`);
  } catch (error) {
    console.error('Error handling sale refunded:', error);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    await prisma.paypal_Subscriptions.create({
      data: {
        paypal_subscription_id: subscription.id,
        status: subscription.status,
        plan_id: subscription.plan_id,
        amount: subscription.plan ? parseFloat(subscription.plan.price) : undefined,
        currency: subscription.plan?.currency || 'USD',
        billing_start_date: new Date(subscription.billing_cycles?.[0]?.start_date || Date.now()),
      },
    });

    console.log(`PayPal subscription created: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    await prisma.paypal_Subscriptions.update({
      where: { paypal_subscription_id: subscription.id },
      data: {
        status: subscription.status,
      },
    });

    console.log(`PayPal subscription updated: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCancelled(subscription: any) {
  try {
    await prisma.paypal_Subscriptions.update({
      where: { paypal_subscription_id: subscription.id },
      data: {
        status: 'CANCELLED',
      },
    });

    console.log(`PayPal subscription cancelled: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription cancelled:', error);
  }
}

async function handleCaptureCompleted(capture: any) {
  try {
    console.log(`PayPal capture completed: ${capture.id}`);
  } catch (error) {
    console.error('Error handling capture completed:', error);
  }
}

async function handleCaptureDenied(capture: any) {
  try {
    console.log(`PayPal capture denied: ${capture.id}`);
  } catch (error) {
    console.error('Error handling capture denied:', error);
  }
}
