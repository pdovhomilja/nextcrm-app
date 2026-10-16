"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { decryptVentureEnv, encryptVentureEnv } from "@/lib/ventures/env-store";
import { hashVenturePassword } from "@/lib/ventures/password";
import { seedVentureAdminPortal } from "@/lib/ventures/provision-admin";

const schema = z.object({
  ventureId: z.string().uuid(),
  adminEmail: z.string().trim().email(),
  adminPassword: z.string().min(8).max(200),
  envContent: z.string().max(100_000).optional(),
});

async function requireAdmin() {
  try {
    const user = await requireRole(["admin"]);
    return user;
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export async function seedVentureAdmin(input: unknown) {
  const user = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: "Admin email and password (min 8 characters) are required." };
  }

  const venture = await prismadb.ventureApp.findUnique({ where: { id: parsed.data.ventureId } });
  if (!venture) return { error: "Venture not found." };

  const envPlain =
    parsed.data.envContent?.trim() || decryptVentureEnv(venture.envEncrypted);
  if (!envPlain.trim()) {
    return { error: "Add VENTURE_PROVISIONING_SECRET in environment variables first." };
  }

  await prismadb.ventureApp.update({
    where: { id: venture.id },
    data: {
      adminEmail: parsed.data.adminEmail,
      adminPasswordHash: await hashVenturePassword(parsed.data.adminPassword),
      ...(parsed.data.envContent?.trim()
        ? { envEncrypted: encryptVentureEnv(parsed.data.envContent) }
        : {}),
    },
  });

  const seed = await seedVentureAdminPortal({
    ventureId: venture.id,
    ventureSlug: venture.slug,
    adminEmail: parsed.data.adminEmail,
    adminPasswordPlain: parsed.data.adminPassword,
    envPlain,
    initiatedByUserId: user.id,
  });

  revalidatePath("/[locale]/(routes)/ventures", "page");

  if (seed.seeded) {
    return {
      success: true as const,
      message: `${seed.message} Sign in at ${seed.adminPortalUrl}/login`,
    };
  }
  return { error: seed.message };
}
