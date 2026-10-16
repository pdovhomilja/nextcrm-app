"use server";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { ensureRofytVenture } from "@/actions/ventures/ensure-rofyt";

export type VentureListItem = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  description: string | null;
  assignedSubdomain: string | null;
  gitRepositoryUrl: string | null;
  adminEmail: string | null;
  externalUrl: string | null;
  lifecycleStatus: string;
  updatedAt: Date;
};

async function requireVenturesAccess() {
  try {
    return await requireRole(["admin", "manager"]);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export async function listVentures(): Promise<VentureListItem[]> {
  await requireVenturesAccess();
  await ensureRofytVenture();

  const rows = await prismadb.ventureApp.findMany({
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      kind: true,
      description: true,
      assignedSubdomain: true,
      gitRepositoryUrl: true,
      adminEmail: true,
      externalUrl: true,
      lifecycleStatus: true,
      updatedAt: true,
    },
  });

  return rows;
}

export async function getVentureBySlug(slug: string) {
  await requireVenturesAccess();
  await ensureRofytVenture();
  return prismadb.ventureApp.findUnique({ where: { slug } });
}
