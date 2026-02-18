import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { hasCompanyAccess } from "@/actions/company-actions";
import { ApiTokenSettings } from "@/components/settings/api-token-settings";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";

interface AccountSettingsPageProps {
  params: Promise<{ cid: string }>;
}

export default async function AccountSettingsPage({
  params,
}: AccountSettingsPageProps) {
  const { cid } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const hasAccess = await hasCompanyAccess(cid, "MEMBER");
  if (!hasAccess) {
    redirect("/");
  }

  return (
    <SidebarInset>
      <SiteHeader title="Account Settings">
        <div className="flex items-center gap-2">{/* Nav buttons */}</div>
      </SiteHeader>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">API Tokens</h1>
          <p className="text-muted-foreground">
            Manage tokens for external AI agent access.
          </p>
        </div>
        <ApiTokenSettings />
      </div>
    </SidebarInset>
  );
}

export function generateMetadata() {
  return {
    title: "Account Settings",
    description: "Manage API tokens and account preferences",
  };
}
