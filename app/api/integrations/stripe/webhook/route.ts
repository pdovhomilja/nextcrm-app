/**
 * POST /api/integrations/stripe/webhook - Handle Stripe webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { StripeIntegrationService } from '@/lib/integrations/stripe';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('stripe-signature') || '';
    const body = await req.text();

    // Verify the webhook signature
    const service = new StripeIntegrationService({
      id: 'temp',
      userId: 'temp',
      integrationType: 'STRIPE',
      integrationName: 'Stripe',
      apiKey: process.env.STRIPE_SECRET_KEY || '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'IDLE',
    } as any);

    const verification = service.verifyWebhookSignature(body, signature);

    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const event = verification.event;

    // Handle different event types
    switch (event.type) {
      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object);
        break;

      case 'charge.failed':
        await handleChargeFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleChargeSucceeded(charge: any) {
  try {
    const payment = await prisma.stripe_Payments.findUnique({
      where: { stripe_payment_id: charge.id },
    });

    if (payment) {
      await prisma.stripe_Payments.update({
        where: { stripe_payment_id: charge.id },
        data: {
          status: 'succeeded',
        },
      });
    } else {
      await prisma.stripe_Payments.create({
        data: {
          stripe_payment_id: charge.id,
          amount: charge.amount / 100,
          currency: charge.currency.toUpperCase(),
          status: 'succeeded',
          payment_method: charge.payment_method_details?.type,
        },
      });
    }

    console.log(`Charge succeeded: ${charge.id}`);
  } catch (error) {
    console.error('Error handling charge succeeded:', error);
  }
}

async function handleChargeFailed(charge: any) {
  try {
    await prisma.stripe_Payments.upsert({
      where: { stripe_payment_id: charge.id },
      update: { status: 'failed' },
      create: {
        stripe_payment_id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency.toUpperCase(),
        status: 'failed',
      },
    });

    console.log(`Charge failed: ${charge.id}`);
  } catch (error) {
    console.error('Error handling charge failed:', error);
  }
}

async function handleChargeRefunded(charge: any) {
  try {
    await prisma.stripe_Payments.update({
      where: { stripe_payment_id: charge.id },
      data: {
        status: 'refunded',
      },
    });

    console.log(`Charge refunded: ${charge.id}`);
  } catch (error) {
    console.error('Error handling charge refunded:', error);
  }
}

async function handleSubscriptionCreated(subscription: any) {
  try {
    await prisma.stripe_Subscriptions.create({
      data: {
        stripe_subscription_id: subscription.id,
        customer_id: subscription.customer,
        status: subscription.status,
        plan_id: subscription.items?.data?.[0]?.plan?.id,
        amount: subscription.items?.data?.[0]?.plan?.amount
          ? subscription.items.data[0].plan.amount / 100
          : undefined,
        currency: subscription.currency?.toUpperCase(),
        next_billing_date: new Date(subscription.current_period_end * 1000),
      },
    });

    console.log(`Subscription created: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    await prisma.stripe_Subscriptions.update({
      where: { stripe_subscription_id: subscription.id },
      data: {
        status: subscription.status,
        next_billing_date: new Date(subscription.current_period_end * 1000),
      },
    });

    console.log(`Subscription updated: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    await prisma.stripe_Subscriptions.update({
      where: { stripe_subscription_id: subscription.id },
      data: {
        status: 'cancelled',
      },
    });

    console.log(`Subscription deleted: ${subscription.id}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    console.log(`Invoice payment succeeded: ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
    console.log(`Invoice payment failed: ${invoice.id}`);
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}
