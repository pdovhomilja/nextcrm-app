import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/auth";
import { getUserById } from "@/actions/user";
import { redirect } from "next/navigation";
import { validateCompanyAccess } from "@/lib/security/company-access-validator";

interface CompanyLayoutProps {
  children: React.ReactNode;
  params: Promise<{ cid: string }>;
}

export default async function CompanyLayout({
  children,
  params,
}: CompanyLayoutProps) {
  const { cid } = await params;

  // 🔒 SERVER-SIDE SECURITY VALIDATION
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // 🚨 CRITICAL: URL [cid] vs Session activeCompanyId validation
  if (session.user.activeCompanyId !== cid) {
    console.warn("SECURITY: Company context mismatch detected", {
      userId: session.user.id,
      urlCompany: cid,
      sessionCompany: session.user.activeCompanyId,
      timestamp: new Date().toISOString(),
    });

    // Force logout via server action
    redirect("/api/auth/force-logout?reason=company-mismatch");
  }

  // 🔒 ADDITIONAL: Use existing company access validator with audit logging
  const validation = await validateCompanyAccess(
    session.user.id,
    cid,
    "board", // Resource type for company access
    undefined, // No specific resource ID
    "access" // Action type
  );

  if (!validation.isAuthorized) {
    console.error("SECURITY: Company access validation failed", {
      userId: session.user.id,
      email: session.user.email,
      attemptedCompany: cid,
      error: validation.error,
      auditLog: validation.auditLog,
      timestamp: new Date().toISOString(),
    });

    redirect("/api/auth/force-logout?reason=unauthorized-company");
  }

  const user = await getUserById(session.user.id);
  
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      {children}
    </SidebarProvider>
  );
}
