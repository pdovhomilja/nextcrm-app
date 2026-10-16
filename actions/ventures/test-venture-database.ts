"use server";

import { VentureDatabaseConnectionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { encryptVentureEnv } from "@/lib/ventures/env-store";
import { decryptVentureEnv } from "@/lib/ventures/env-store";
import { mergeDatabaseUrlIntoEnv } from "@/lib/ventures/merge-env-database";
import { testDatabaseUrl } from "@/lib/ventures/test-database-url";

const schema = z.object({
  ventureId: z.string().uuid(),
  databaseUrl: z.string().trim().min(8).max(2000),
});

async function requireAdmin() {
  try {
    return await requireRole(["admin"]);
  } catch (e) {
    if (e instanceof AuthorizationError) throw new Error("Forbidden");
    throw new Error("Unauthorized");
  }
}

export async function testVentureDatabaseConnection(input: unknown) {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid database URL." };
  }

  const venture = await prismadb.ventureApp.findUnique({ where: { id: parsed.data.ventureId } });
  if (!venture) return { error: "Venture not found." };

  const result = await testDatabaseUrl(parsed.data.databaseUrl);
  const now = new Date();
  const envPlain = mergeDatabaseUrlIntoEnv(
    decryptVentureEnv(venture.envEncrypted),
    parsed.data.databaseUrl,
  );

  await prismadb.ventureApp.update({
    where: { id: parsed.data.ventureId },
    data: {
      databaseUrl: parsed.data.databaseUrl,
      databaseConnectionStatus: result.ok
        ? VentureDatabaseConnectionStatus.connected
        : VentureDatabaseConnectionStatus.failed,
      lastDatabaseConnectionTestAt: now,
      envEncrypted: encryptVentureEnv(envPlain),
    },
  });

  revalidatePath("/[locale]/(routes)/ventures", "page");

  if (!result.ok) {
    return { connected: false as const, error: result.error };
  }
  return { connected: true as const, message: "Connected to database." };
}
