"use server";

import { VentureAppKind, VentureLifecycleStatus } from "@prisma/client";

import { prismadb } from "@/lib/prisma";
import { ROFYT_DEFAULT_GIT_REPOSITORY_URL, ROFYT_SLUG } from "@/lib/ventures/catalog";
import { emptyVentureExtensions } from "@/lib/ventures/create-venture-schema";
import {
  ensureDefaultTargetsForVenture,
  syncVentureTargetDeploymentUrls,
} from "@/lib/ventures/ensure-targets";
import { normalizeGitRepositoryUrl } from "@/lib/ventures/git-repo";
import {
  adminHostForKey,
  defaultAdminUrl,
  defaultErpUrl,
  erpHostForKey,
} from "@/lib/ventures/subdomain";

/** Ensures ROFYT venture + default ERP/Admin targets exist (does not deploy apps). */
export async function ensureRofytVenture() {
  const key = ROFYT_SLUG;
  const assignedSubdomain = erpHostForKey(key);
  const adminEmail =
    process.env.ROFYT_ADMIN_EMAIL?.trim() ||
    process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() ||
    null;

  const gitRaw =
    process.env.ROFYT_GIT_REPOSITORY_URL?.trim() || ROFYT_DEFAULT_GIT_REPOSITORY_URL;
  const gitRepositoryUrl = normalizeGitRepositoryUrl(gitRaw);

  const venture = await prismadb.ventureApp.upsert({
    where: { slug: key },
    create: {
      slug: key,
      name: "ROFYT",
      kind: VentureAppKind.rofyt,
      description: "Car rental ERP — VenSai Labs venture",
      assignedSubdomain,
      lifecycleStatus: VentureLifecycleStatus.domain_assigned,
      gitRepositoryUrl,
      extensionsJson: emptyVentureExtensions(),
      adminEmail,
      externalUrl: process.env.ROFYT_EXTERNAL_URL?.trim() || defaultErpUrl(key),
      notes: `ERP: ${defaultErpUrl(key)} · Admin: ${defaultAdminUrl(key)} (${adminHostForKey(key)})`,
    },
    update: {
      assignedSubdomain,
      lifecycleStatus: VentureLifecycleStatus.domain_assigned,
      gitRepositoryUrl,
    },
  });

  await ensureDefaultTargetsForVenture(venture.id, key);

  const erpUrl = process.env.ROFYT_ERP_URL?.trim() || defaultErpUrl(key);
  const adminUrl =
    process.env.ROFYT_ADMIN_URL?.trim() ||
    process.env.VENTURE_ADMIN_PORTAL_URL?.trim() ||
    "https://admin.vensailabs.in";
  await syncVentureTargetDeploymentUrls(venture.id, {
    erp: erpUrl,
    admin: adminUrl,
  });

  return venture;
}
