import { OnboardingForm } from "./components/OnboardingForm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";

const OnboardingPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const user = await prismadb.users.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (user?.organizationId) {
    redirect("/");
  }

  return (
    <div className="flex flex-col w-full h-full overflow-auto p-10 space-y-5">
      <div className="text-center">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Welcome to {process.env.NEXT_PUBLIC_APP_NAME || "NextCRM"}
        </h1>
        <p className="text-muted-foreground mt-4">
          Let&apos;s get you started by creating your organization
        </p>
      </div>
      <OnboardingForm />
    </div>
  );
};

export default OnboardingPage;
