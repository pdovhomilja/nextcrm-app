import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import { InviteMemberForm } from "./components/InviteMemberForm";
import { TeamMembersList } from "./components/TeamMembersList";
import { PendingInvitations } from "./components/PendingInvitations";
import { canManageMembers } from "@/lib/permissions";

const TeamPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/sign-in");
  }

  const user = await prismadb.users.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.organizationId) {
    redirect("/onboarding");
  }

  const organization = await prismadb.organizations.findUnique({
    where: { id: user.organizationId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          organization_role: true,
          created_on: true,
        },
        orderBy: { created_on: "desc" },
      },
    },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  const canManage = canManageMembers(user.organization_role);

  return (
    <div className="flex flex-col w-full h-full overflow-auto p-10 space-y-8">
      <div>
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Team Management
        </h1>
        <p className="text-muted-foreground mt-2">
          Invite team members and manage their roles and permissions
        </p>
      </div>

      {canManage && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Invite New Member
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Send invitations to team members and assign their roles
            </p>
            <div className="mt-4">
              <InviteMemberForm />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">
              Pending Invitations
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage pending team member invitations
            </p>
            <PendingInvitations />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Team Members</h2>
        <p className="text-sm text-muted-foreground">
          {organization.users.length} member{organization.users.length !== 1 ? "s" : ""} in your
          organization
        </p>
        <TeamMembersList
          members={organization.users}
          currentUserId={user.id}
          currentUserRole={user.organization_role}
          isOwner={organization.ownerId === user.id}
          canManage={canManage}
        />
      </div>
    </div>
  );
};

export default TeamPage;
