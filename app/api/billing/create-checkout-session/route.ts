import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import { PLANS } from "@/lib/subscription-plans";
import { OrganizationPlan } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const body = await req.json();
    const { plan } = body as { plan: OrganizationPlan };

    if (!plan || !PLANS[plan]) {
      return new NextResponse("Invalid plan", { status: 400 });
    }

    if (plan === "FREE") {
      return new NextResponse("Cannot create checkout for free plan", { status: 400 });
    }

    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
      include: {
        organization: true,
      },
    });

    if (!user || !user.organizationId || !user.organization) {
      return new NextResponse("User not associated with an organization", { status: 400 });
    }

    const organization = user.organization;

    if (organization.plan !== "FREE" && organization.plan === plan) {
      return new NextResponse("Organization already has this plan", { status: 400 });
    }

    const planDetails = PLANS[plan];

    if (!planDetails.stripePriceId) {
      return new NextResponse("Plan price ID not configured", { status: 500 });
    }

    let customer;
    if (organization.stripeCustomerId) {
      customer = await stripe.customers.retrieve(organization.stripeCustomerId);
    } else {
      customer = await getOrCreateStripeCustomer({
        email: session.user.email,
        name: organization.name,
        organizationId: organization.id,
      });

      await prismadb.organizations.update({
        where: { id: organization.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: planDetails.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        organizationId: organization.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          organizationId: organization.id,
          plan: plan,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[CHECKOUT_SESSION_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
