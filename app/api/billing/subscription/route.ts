import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    const user = await prismadb.users.findUnique({
      where: { email: session.user.email },
      include: {
        organization: {
          include: {
            subscriptions: {
              where: {
                status: {
                  in: ["ACTIVE", "TRIALING", "PAST_DUE"],
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
            },
            paymentHistory: {
              orderBy: {
                createdAt: "desc",
              },
              take: 10,
            },
          },
        },
      },
    });

    if (!user || !user.organizationId || !user.organization) {
      return new NextResponse("User not associated with an organization", { status: 400 });
    }

    const organization = user.organization;
    const currentSubscription = organization.subscriptions[0] || null;

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        plan: organization.plan,
        status: organization.status,
        stripeCustomerId: organization.stripeCustomerId,
      },
      subscription: currentSubscription,
      paymentHistory: organization.paymentHistory,
    });
  } catch (error) {
    console.error("[SUBSCRIPTION_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
