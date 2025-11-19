import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import { OrganizationForm } from "./components/OrganizationForm";

const OrganizationSettingsPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const user = await prismadb.users.findUnique({
    where: {
      email: session.user.email,
    },
  });

  if (!user?.organizationId) {
    redirect("/onboarding");
  }

  const organization = await prismadb.organizations.findUnique({
    where: {
      id: user.organizationId,
    },
    include: {
      users: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  const isOwnerOrAdmin = organization.ownerId === user.id || user.is_admin;
  const memberCount = organization.users.length;

  return (
    <div className="flex flex-col w-full h-full overflow-auto p-10 space-y-5">
      <div>
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Organization Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization configuration and settings
        </p>
      </div>
      <OrganizationForm
        organization={{
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
          status: organization.status,
          ownerId: organization.ownerId,
        }}
        isOwnerOrAdmin={isOwnerOrAdmin}
        memberCount={memberCount}
      />
    </div>
  );
};

export default OrganizationSettingsPage;
