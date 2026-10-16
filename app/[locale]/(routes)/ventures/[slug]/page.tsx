import { redirect, notFound } from "next/navigation";

import { getVentureAdminTarget, getVentureBySlug } from "@/actions/ventures/list-ventures";
import { VentureDetailCard } from "@/components/ventures/VentureDetailCard";
import { VentureSettingsPanel } from "@/components/ventures/VentureSettingsPanel";
import { decryptVentureEnv } from "@/lib/ventures/env-store";
import { ROFYT_SLUG } from "@/lib/ventures/catalog";
import Container from "../../components/ui/Container";
import { getSession } from "@/lib/auth-server";

type Props = { params: Promise<{ slug: string }> };

export default async function VentureDetailPage({ params }: Props) {
  const { slug } = await params;
  if (slug === ROFYT_SLUG) redirect("/ventures/rofyt");

  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.role !== "admin") redirect("/ventures");

  const venture = await getVentureBySlug(slug);
  if (!venture || venture.kind !== "custom") notFound();

  const envPreview = decryptVentureEnv(venture.envEncrypted);
  const adminTarget = await getVentureAdminTarget(venture.id);

  return (
    <Container title={venture.name} description="Venture control plane — repository, domains, and credentials.">
      <div className="space-y-8">
        <VentureDetailCard
          name={venture.name}
          slug={venture.slug}
          description={venture.description}
          assignedSubdomain={venture.assignedSubdomain}
          gitRepositoryUrl={venture.gitRepositoryUrl}
          externalUrl={venture.externalUrl}
          lifecycleStatus={venture.lifecycleStatus}
        />
        <VentureSettingsPanel
          ventureId={venture.id}
          description={venture.description}
          assignedSubdomain={venture.assignedSubdomain}
          gitRepositoryUrl={venture.gitRepositoryUrl}
          adminEmail={venture.adminEmail}
          envPreview={envPreview}
          externalUrl={venture.externalUrl}
          databaseUrl={venture.databaseUrl}
          databaseConnectionStatus={venture.databaseConnectionStatus}
          notes={venture.notes}
          adminPortalUrl={adminTarget?.deploymentUrl ?? null}
          adminProvisioningStatus={adminTarget?.provisioningStatus ?? null}
        />
      </div>
    </Container>
  );
}
