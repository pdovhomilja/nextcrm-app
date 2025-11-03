import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
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

    if (!organization.stripeCustomerId) {
      return new NextResponse("No Stripe customer found for this organization", { status: 400 });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: organization.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[PORTAL_SESSION_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
