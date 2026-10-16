"use server";

import { revalidatePath } from "next/cache";
import { VentureAppKind, VentureLifecycleStatus } from "@prisma/client";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import {
  createVentureInputSchema,
  emptyVentureExtensions,
} from "@/lib/ventures/create-venture-schema";
import { encryptVentureEnv } from "@/lib/ventures/env-store";
import { ensureDefaultTargetsForVenture } from "@/lib/ventures/ensure-targets";
import { hashVenturePassword } from "@/lib/ventures/password";
import { seedVentureAdminPortal } from "@/lib/ventures/provision-admin";
import { erpHostForKey, normalizeVentureKey } from "@/lib/ventures/subdomain";

async function requireAdmin() {
  try {
    const user = await requireRole(["admin"]);
    return user;
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export async function createVenture(input: unknown) {
  const user = await requireAdmin();
  const parsed = createVentureInputSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid venture data.";
    return { error: first };
  }
  const data = parsed.data;
  const slug = normalizeVentureKey(data.slug);

  const slugTaken = await prismadb.ventureApp.findUnique({ where: { slug } });
  if (slugTaken) return { error: "A venture with this key already exists." };

  const gitTaken = await prismadb.ventureApp.findFirst({
    where: { gitRepositoryUrl: data.gitRepositoryUrl },
  });
  if (gitTaken) return { error: "This Git repository is already linked to another venture." };

  const venture = await prismadb.ventureApp.create({
    data: {
      name: data.name.trim(),
      slug,
      kind: VentureAppKind.custom,
      description: data.description,
      assignedSubdomain: erpHostForKey(slug),
      lifecycleStatus: VentureLifecycleStatus.domain_assigned,
      gitRepositoryUrl: data.gitRepositoryUrl,
      extensionsJson: emptyVentureExtensions(),
      adminEmail: data.adminEmail,
      adminPasswordHash: await hashVenturePassword(data.adminPassword),
      envEncrypted: encryptVentureEnv(data.envContent),
      externalUrl: data.externalUrl,
      notes: data.notes,
      createdBy: user.id,
    },
  });

  await ensureDefaultTargetsForVenture(venture.id, slug);

  const seed = await seedVentureAdminPortal({
    ventureId: venture.id,
    ventureSlug: slug,
    adminEmail: data.adminEmail,
    adminPasswordPlain: data.adminPassword,
    envPlain: data.envContent,
    initiatedByUserId: user.id,
  });

  revalidatePath("/[locale]/(routes)/ventures", "page");
  return {
    success: true as const,
    slug,
    seedMessage: seed.seeded
      ? `${seed.message} Sign in at ${seed.adminPortalUrl}/login`
      : "skipped" in seed && seed.skipped
        ? undefined
        : seed.message,
  };
}
