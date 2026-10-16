"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { encryptVentureEnv } from "@/lib/ventures/env-store";
import { hashVenturePassword } from "@/lib/ventures/password";

const schema = z.object({
  id: z.string().uuid(),
  adminEmail: z.string().email().optional().or(z.literal("")),
  adminPassword: z.string().min(8).max(200).optional().or(z.literal("")),
  envContent: z.string().max(100_000).optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(5000).optional(),
});

async function requireAdmin() {
  try {
    return await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export async function updateVenture(input: z.infer<typeof schema>) {
  await requireAdmin();
  const data = schema.parse(input);

  const password = data.adminPassword?.trim();
  const envPlain = data.envContent;

  await prismadb.ventureApp.update({
    where: { id: data.id },
    data: {
      adminEmail: data.adminEmail?.trim() || null,
      ...(password ? { adminPasswordHash: await hashVenturePassword(password) } : {}),
      ...(envPlain !== undefined
        ? { envEncrypted: encryptVentureEnv(envPlain) }
        : {}),
      externalUrl: data.externalUrl?.trim() || null,
      notes: data.notes?.trim() || null,
    },
  });

  revalidatePath("/[locale]/(routes)/ventures", "page");
  return { success: true as const };
}
