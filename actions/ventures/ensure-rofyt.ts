"use server";

import { VentureAppKind } from "@prisma/client";

import { prismadb } from "@/lib/prisma";
import { ROFYT_SLUG } from "@/lib/ventures/catalog";
import { hashVenturePassword } from "@/lib/ventures/password";

/** Ensures the default Rofyt venture row exists (password from ROFYT_ADMIN_PASSWORD env only). */
export async function ensureRofytVenture() {
  const existing = await prismadb.ventureApp.findUnique({ where: { slug: ROFYT_SLUG } });
  if (existing) return existing;

  const bootstrapPassword = process.env.ROFYT_ADMIN_PASSWORD?.trim();
  const adminEmail =
    process.env.ROFYT_ADMIN_EMAIL?.trim() ||
    process.env.BOOTSTRAP_ADMIN_EMAIL?.trim() ||
    null;

  return prismadb.ventureApp.create({
    data: {
      slug: ROFYT_SLUG,
      name: "Rofyt",
      kind: VentureAppKind.rofyt,
      adminEmail,
      adminPasswordHash: bootstrapPassword ? await hashVenturePassword(bootstrapPassword) : null,
      externalUrl: process.env.ROFYT_EXTERNAL_URL?.trim() || null,
      notes: "Default Rofyt venture — connect stats and env from VenSai CRM.",
    },
  });
}
