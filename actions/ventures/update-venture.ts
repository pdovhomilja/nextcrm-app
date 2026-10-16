"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { encryptVentureEnv } from "@/lib/ventures/env-store";
import { isValidGitRepositoryUrl, normalizeGitRepositoryUrl } from "@/lib/ventures/git-repo";
import { hashVenturePassword } from "@/lib/ventures/password";
import { seedVentureAdminPortal } from "@/lib/ventures/provision-admin";

const schema = z.object({
  id: z.string().uuid(),
  description: z.string().trim().min(10, "Description is required.").max(2000),
  gitRepositoryUrl: z
    .string()
    .trim()
    .min(1, "Git repository URL is required.")
    .refine(isValidGitRepositoryUrl, {
      message: "Enter a valid GitHub, GitLab, or Bitbucket repository URL.",
    })
    .transform(normalizeGitRepositoryUrl),
  adminEmail: z.string().trim().email("Administrator email is required."),
  adminPassword: z.string().min(8).max(200).optional().or(z.literal("")),
  envContent: z.string().trim().min(1, "Environment contents are required.").max(100_000),
  externalUrl: z.string().trim().url("Primary app URL must be valid."),
  notes: z.string().trim().min(1, "Project notes are required.").max(5000),
});

async function requireAdmin() {
  try {
    return await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export async function updateVenture(input: unknown) {
  const user = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid venture data.";
    return { error: first };
  }
  const data = parsed.data;

  const gitTaken = await prismadb.ventureApp.findFirst({
    where: {
      gitRepositoryUrl: data.gitRepositoryUrl,
      NOT: { id: data.id },
    },
  });
  if (gitTaken) return { error: "This Git repository is already linked to another venture." };

  const password = data.adminPassword?.trim();

  const existing = await prismadb.ventureApp.findUnique({ where: { id: data.id } });
  if (!existing) return { error: "Venture not found." };

  await prismadb.ventureApp.update({
    where: { id: data.id },
    data: {
      description: data.description,
      gitRepositoryUrl: data.gitRepositoryUrl,
      adminEmail: data.adminEmail,
      ...(password ? { adminPasswordHash: await hashVenturePassword(password) } : {}),
      envEncrypted: encryptVentureEnv(data.envContent),
      externalUrl: data.externalUrl,
      notes: data.notes,
    },
  });

  let seedMessage: string | undefined;
  if (password) {
    const seed = await seedVentureAdminPortal({
      ventureId: data.id,
      ventureSlug: existing.slug,
      adminEmail: data.adminEmail,
      adminPasswordPlain: password,
      envPlain: data.envContent,
      initiatedByUserId: user.id,
    });
    if (seed.seeded) {
      seedMessage = `${seed.message} Sign in at ${seed.adminPortalUrl}/login`;
    } else if (!seed.skipped) {
      seedMessage = seed.message;
    }
  }

  revalidatePath("/[locale]/(routes)/ventures", "page");
  return { success: true as const, seedMessage };
}
