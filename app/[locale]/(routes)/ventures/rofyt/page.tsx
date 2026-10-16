import { redirect } from "next/navigation";

import { getRofytStatsIfAuthorized } from "@/actions/ventures/rofyt-stats";
import { getVentureBySlug } from "@/actions/ventures/list-ventures";
import { RofytDashboard } from "@/components/ventures/RofytDashboard";
import { RofytLoginForm } from "@/components/ventures/RofytLoginForm";
import { VentureSettingsPanel } from "@/components/ventures/VentureSettingsPanel";
import { RofytLockButton } from "@/components/ventures/RofytLockButton";
import { decryptVentureEnv } from "@/lib/ventures/env-store";
import { hasRofytAdminSession } from "@/lib/ventures/rofyt-session";
import { ROFYT_SLUG } from "@/lib/ventures/catalog";
import Container from "../../components/ui/Container";
import { getSession } from "@/lib/auth-server";

export default async function RofytVenturePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const role = session.user.role;
  if (role !== "admin" && role !== "manager") redirect("/");

  let venture: Awaited<ReturnType<typeof getVentureBySlug>> = null;
  try {
    venture = await getVentureBySlug(ROFYT_SLUG);
  } catch {
    redirect("/");
  }
  if (!venture) redirect("/ventures");

  const unlocked = await hasRofytAdminSession(venture.id);

  const { stats } = unlocked ? await getRofytStatsIfAuthorized() : { stats: null };

  const envPreview =
    role === "admin" && unlocked ? decryptVentureEnv(venture.envEncrypted) : "";

  return (
    <Container
      title="Rofyt"
      description="Operations hub — CRM-linked stats, graphs, and venture configuration."
    >
      {!unlocked ? (
        <RofytLoginForm />
      ) : (
        <div className="space-y-8">
          {stats ? <RofytDashboard stats={stats} /> : null}
          {role === "admin" ? (
            <VentureSettingsPanel
              ventureId={venture.id}
              adminEmail={venture.adminEmail}
              envPreview={envPreview}
              externalUrl={venture.externalUrl}
              notes={venture.notes}
              showLogout
            />
          ) : (
            <div className="flex justify-end">
              <RofytLockButton />
            </div>
          )}
        </div>
      )}
    </Container>
  );
}
