import { redirect, notFound } from "next/navigation";

import { getVentureBySlug } from "@/actions/ventures/list-ventures";
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

  return (
    <Container title={venture.name} description="Manage credentials and environment for this venture.">
      <VentureSettingsPanel
        ventureId={venture.id}
        adminEmail={venture.adminEmail}
        envPreview={envPreview}
        externalUrl={venture.externalUrl}
        notes={venture.notes}
      />
    </Container>
  );
}
