import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import { PricingCards } from "./components/PricingCards";

const PricingPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const user = await prismadb.users.findUnique({
    where: {
      email: session.user.email,
    },
    include: {
      organization: true,
    },
  });

  const currentPlan = user?.organization?.plan || "FREE";

  return (
    <div className="flex flex-col w-full h-full overflow-auto p-10 space-y-5">
      <div className="text-center space-y-4">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
          Select the perfect plan for your organization. Upgrade or downgrade at any time.
        </p>
      </div>
      <PricingCards currentPlan={currentPlan} />
    </div>
  );
};

export default PricingPage;
