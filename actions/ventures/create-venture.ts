"use server";

import { revalidatePath } from "next/cache";
import { VentureAppKind } from "@prisma/client";
import { z } from "zod";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { encryptVentureEnv } from "@/lib/ventures/env-store";
import { hashVenturePassword } from "@/lib/ventures/password";

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only"),
  adminEmail: z.string().email().optional().or(z.literal("")),
  adminPassword: z.string().min(8).max(200).optional().or(z.literal("")),
  envContent: z.string().max(100_000).optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(5000).optional(),
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

export async function createVenture(input: z.infer<typeof schema>) {
  const user = await requireAdmin();
  const data = schema.parse(input);

  const slugTaken = await prismadb.ventureApp.findUnique({ where: { slug: data.slug } });
  if (slugTaken) return { error: "A venture with this slug already exists." };

  const password = data.adminPassword?.trim();
  const envPlain = data.envContent ?? "";

  await prismadb.ventureApp.create({
    data: {
      name: data.name.trim(),
      slug: data.slug,
      kind: VentureAppKind.custom,
      adminEmail: data.adminEmail?.trim() || null,
      adminPasswordHash: password ? await hashVenturePassword(password) : null,
      envEncrypted: encryptVentureEnv(envPlain),
      externalUrl: data.externalUrl?.trim() || null,
      notes: data.notes?.trim() || null,
      createdBy: user.id,
    },
  });

  revalidatePath("/[locale]/(routes)/ventures", "page");
  return { success: true as const };
}
