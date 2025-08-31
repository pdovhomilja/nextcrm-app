import { auth } from "@/auth";
import { getCompanyDetails, hasCompanyAccess } from "@/actions/company-actions";
import { redirect } from "next/navigation";
import { CompanySettingsContent } from "./company-settings-content";

interface CompanySettingsPageProps {
  params: Promise<{ cid: string }>;
}

export default async function CompanySettingsPage({
  params,
}: CompanySettingsPageProps) {
  const { cid } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Verify user has access to this company
  const hasAccess = await hasCompanyAccess(cid, "MEMBER");
  if (!hasAccess) {
    redirect("/");
  }

  // Get company details with members
  const result = await getCompanyDetails(cid);
  if (!result.success || !result.company) {
    redirect("/");
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
        <p className="text-muted-foreground">
          Manage your team members and company preferences.
        </p>
      </div>

      <CompanySettingsContent
        company={result.company}
        userRole={result.userRole}
        currentUserId={session.user.id}
      />
    </div>
  );
}

export async function generateMetadata({ params }: CompanySettingsPageProps) {
  const { cid } = await params;

  const result = await getCompanyDetails(cid);
  const companyName = result.success ? result.company?.name : "Company";

  return {
    title: `${companyName} - Settings`,
    description: `Manage ${companyName} team members and settings`,
  };
}
