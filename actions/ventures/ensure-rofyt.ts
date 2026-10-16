"use server";

import { VentureAppKind, VentureLifecycleStatus } from "@prisma/client";

import { prismadb } from "@/lib/prisma";
import { ROFYT_SLUG } from "@/lib/ventures/catalog";
import { adminHostForKey, defaultAdminUrl, defaultErpUrl, erpHostForKey } from "@/lib/ventures/subdomain";

const DEFAULT_TARGETS = [
  {
    targetKey: "erp",
    displayName: "ROFYT ERP",
    applicationType: "erp",
    urlEnv: "ROFYT_ERP_URL",
    defaultUrl: (key: string) => defaultErpUrl(key),
  },
  {
    targetKey: "admin",
    displayName: "ROFYT Admin Portal",
    applicationType: "admin_portal",
    urlEnv: "ROFYT_ADMIN_URL",
    defaultUrl: (key: string) => defaultAdminUrl(key),
  },
] as const;

async function ensureDefaultTargets(ventureId: string, key: string) {
  for (const spec of DEFAULT_TARGETS) {
    const envUrl = process.env[spec.urlEnv]?.trim();
    const deploymentUrl = envUrl || spec.defaultUrl(key);
    await prismadb.ventureApplicationTarget.upsert({
      where: {
        ventureId_targetKey: { ventureId, targetKey: spec.targetKey },
      },
      create: {
        ventureId,
        targetKey: spec.targetKey,
        displayName: spec.displayName,
        applicationType: spec.applicationType,
        deploymentUrl,
      },
      update: {},
    });
  }
}

/** Ensures ROFYT venture + default ERP/Admin targets exist (does not deploy apps). */
export async function ensureRofytVenture() {
  const key = ROFYT_SLUG;
  const assignedSubdomain = erpHostForKey(key);
  const adminEmail =
    process.env.ROFYT_ADMIN_EMAIL?.trim() ||
    process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() ||
    null;

  const venture = await prismadb.ventureApp.upsert({
    where: { slug: key },
    create: {
      slug: key,
      name: "ROFYT",
      kind: VentureAppKind.rofyt,
      description: "Car rental ERP — VenSai Labs venture",
      assignedSubdomain,
      lifecycleStatus: VentureLifecycleStatus.domain_assigned,
      adminEmail,
      externalUrl: process.env.ROFYT_EXTERNAL_URL?.trim() || defaultErpUrl(key),
      notes: `ERP: ${defaultErpUrl(key)} · Admin: ${defaultAdminUrl(key)} (${adminHostForKey(key)})`,
    },
    update: {
      assignedSubdomain,
      lifecycleStatus: VentureLifecycleStatus.domain_assigned,
    },
  });

  await ensureDefaultTargets(venture.id, key);
  return venture;
}
