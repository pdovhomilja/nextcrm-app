import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prismadb } from "@/lib/prisma";
import Stripe from "stripe";
import { OrganizationPlan } from "@prisma/client";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature") as string;

  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("[STRIPE_WEBHOOK] Missing STRIPE_WEBHOOK_SECRET");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error: any) {
    console.error(`[STRIPE_WEBHOOK] Webhook signature verification failed: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  console.log(`[STRIPE_WEBHOOK] Event type: ${event.type}`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[STRIPE_WEBHOOK] Error processing webhook:", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const sub = subscription as any; // Type assertion for Stripe properties

  const organization = await prismadb.organizations.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) {
    console.error(`[STRIPE_WEBHOOK] Organization not found for customer: ${customerId}`);
    return;
  }

  const plan = getPlanFromPriceId(priceId);

  await prismadb.$transaction([
    prismadb.subscriptions.upsert({
      where: { stripeSubscriptionId: subscription.id },
      create: {
        organizationId: organization.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId,
        status: mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      },
      update: {
        stripePriceId: priceId,
        status: mapStripeStatus(subscription.status),
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      },
    }),
    prismadb.organizations.update({
      where: { id: organization.id },
      data: { plan },
    }),
  ]);

  console.log(`[STRIPE_WEBHOOK] Updated subscription for organization ${organization.id} to ${plan}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const organization = await prismadb.organizations.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) {
    console.error(`[STRIPE_WEBHOOK] Organization not found for customer: ${customerId}`);
    return;
  }

  await prismadb.$transaction([
    prismadb.subscriptions.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: "CANCELED",
        canceledAt: new Date(),
        cancelAtPeriodEnd: false,
      },
    }),
    prismadb.organizations.update({
      where: { id: organization.id },
      data: { plan: "FREE" },
    }),
  ]);

  console.log(`[STRIPE_WEBHOOK] Canceled subscription for organization ${organization.id}`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const inv = invoice as any; // Type assertion for Stripe properties
  const customerId = invoice.customer as string;
  const paymentIntentId = inv.payment_intent as string;

  if (!paymentIntentId) {
    console.log("[STRIPE_WEBHOOK] No payment intent for invoice");
    return;
  }

  const organization = await prismadb.organizations.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) {
    console.error(`[STRIPE_WEBHOOK] Organization not found for customer: ${customerId}`);
    return;
  }

  await prismadb.paymentHistory.upsert({
    where: { stripePaymentIntentId: paymentIntentId },
    create: {
      organizationId: organization.id,
      stripePaymentIntentId: paymentIntentId,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "SUCCEEDED",
      description: invoice.description || `Payment for ${organization.name}`,
      receiptUrl: invoice.hosted_invoice_url,
    },
    update: {
      status: "SUCCEEDED",
      amount: invoice.amount_paid,
      receiptUrl: invoice.hosted_invoice_url,
    },
  });

  console.log(`[STRIPE_WEBHOOK] Payment succeeded for organization ${organization.id}: ${invoice.amount_paid / 100} ${invoice.currency}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any; // Type assertion for Stripe properties
  const customerId = invoice.customer as string;
  const paymentIntentId = inv.payment_intent as string;

  if (!paymentIntentId) {
    console.log("[STRIPE_WEBHOOK] No payment intent for failed invoice");
    return;
  }

  const organization = await prismadb.organizations.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!organization) {
    console.error(`[STRIPE_WEBHOOK] Organization not found for customer: ${customerId}`);
    return;
  }

  await prismadb.paymentHistory.upsert({
    where: { stripePaymentIntentId: paymentIntentId },
    create: {
      organizationId: organization.id,
      stripePaymentIntentId: paymentIntentId,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: "FAILED",
      description: invoice.description || `Failed payment for ${organization.name}`,
    },
    update: {
      status: "FAILED",
    },
  });

  console.log(`[STRIPE_WEBHOOK] Payment failed for organization ${organization.id}`);
}

function getPlanFromPriceId(priceId: string): OrganizationPlan {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    return "PRO";
  } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
    return "ENTERPRISE";
  }
  return "FREE";
}

function mapStripeStatus(status: Stripe.Subscription.Status): any {
  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
    incomplete_expired: "INCOMPLETE_EXPIRED",
    trialing: "TRIALING",
    unpaid: "UNPAID",
  };

  return statusMap[status] || "ACTIVE";
}
