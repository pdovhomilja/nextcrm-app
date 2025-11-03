import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import { BillingInfo } from "./components/BillingInfo";

const BillingSettingsPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const user = await prismadb.users.findUnique({
    where: {
      email: session.user.email,
    },
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
          users: true,
          crm_contacts: true,
          documents: true,
          boards: true,
        },
      },
    },
  });

  if (!user || !user.organizationId || !user.organization) {
    redirect("/onboarding");
  }

  const organization = user.organization;
  const currentSubscription = organization.subscriptions[0] || null;

  const usage = {
    users: organization.users.length,
    contacts: organization.crm_contacts.length,
    storage: 0,
    projects: organization.boards.length,
    documents: organization.documents.length,
  };

  return (
    <div className="flex flex-col w-full h-full overflow-auto p-10 space-y-5">
      <div>
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Billing & Subscription
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription, billing, and payment history
        </p>
      </div>
      <BillingInfo
        organization={{
          id: organization.id,
          name: organization.name,
          plan: organization.plan,
          status: organization.status,
          stripeCustomerId: organization.stripeCustomerId,
        }}
        subscription={currentSubscription}
        paymentHistory={organization.paymentHistory}
        usage={usage}
      />
    </div>
  );
};

export default BillingSettingsPage;
