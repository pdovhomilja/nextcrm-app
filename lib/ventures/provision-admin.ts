import { randomUUID } from "crypto";

import {
  VentureProvisioningStatus,
  VentureTargetHealth,
} from "@prisma/client";

import { prismadb } from "@/lib/prisma";
import { encryptVentureEnv } from "@/lib/ventures/env-store";
import {
  readEnvVarFromContent,
  VENTURE_PROVISIONING_SECRET_KEY,
} from "@/lib/ventures/parse-env";
import { postProvisionAdminToTarget } from "@/lib/ventures/provisioning-http";

export type SeedAdminResult =
  | { seeded: true; status: "seeded" | "already_exists"; message: string; adminPortalUrl: string }
  | { seeded: false; skipped?: true; message: string }
  | { seeded: false; message: string };

function adminTargetFor(
  targets: {
    id: string;
    targetKey: string;
    applicationType: string;
    deploymentUrl: string;
  }[],
) {
  return (
    targets.find((t) => t.targetKey === "admin") ??
    targets.find((t) => t.applicationType === "admin_portal")
  );
}

/** Push administrator credentials to the venture's admin portal (CRM → target API). */
export async function seedVentureAdminPortal(input: {
  ventureId: string;
  ventureSlug: string;
  adminEmail: string;
  adminPasswordPlain: string;
  envPlain: string;
  initiatedByUserId: string;
}): Promise<SeedAdminResult> {
  const password = input.adminPasswordPlain.trim();
  if (password.length < 8) {
    return {
      seeded: false,
      skipped: true,
      message: "Admin password not changed — skipped seeding the admin portal.",
    };
  }

  const secretFromEnv =
    readEnvVarFromContent(input.envPlain, VENTURE_PROVISIONING_SECRET_KEY)?.trim() ||
    process.env.VENTURES_DEFAULT_PROVISIONING_SECRET?.trim() ||
    null;

  if (!secretFromEnv) {
    return {
      seeded: false,
      message:
        "Add VENTURE_PROVISIONING_SECRET to the venture .env (must match the admin portal deployment).",
    };
  }

  const venture = await prismadb.ventureApp.findUnique({
    where: { id: input.ventureId },
    include: { targets: true },
  });
  if (!venture) return { seeded: false, message: "Venture not found." };

  const target = adminTargetFor(venture.targets);
  if (!target) {
    return { seeded: false, message: "No admin portal target configured for this venture." };
  }

  await prismadb.ventureApplicationTarget.update({
    where: { id: target.id },
    data: {
      administratorEmail: input.adminEmail,
      provisioningSecretEncrypted: encryptVentureEnv(secretFromEnv),
    },
  });

  const correlationId = randomUUID();
  const idempotencyKey = randomUUID();

  await prismadb.provisioningOperation.create({
    data: {
      ventureId: input.ventureId,
      targetId: target.id,
      initiatedByUserId: input.initiatedByUserId,
      operationType: "seed_admin",
      idempotencyKey,
      status: "running",
      correlationId,
    },
  });

  const body = {
    ventureKey: input.ventureSlug,
    targetKey: "admin",
    adminEmail: input.adminEmail,
    adminPassword: password,
    idempotencyKey,
    correlationId,
  };

  const result = await postProvisionAdminToTarget({
    deploymentUrl: target.deploymentUrl,
    secret: secretFromEnv,
    body,
  });

  const completedAt = new Date();

  if (!result.ok) {
    await prismadb.provisioningOperation.update({
      where: { idempotencyKey },
      data: {
        status: "failed",
        completedAt,
        sanitizedResult: { message: result.error },
      },
    });
    await prismadb.ventureApplicationTarget.update({
      where: { id: target.id },
      data: {
        provisioningStatus: VentureProvisioningStatus.failed,
        healthStatus: VentureTargetHealth.unreachable,
        lastProvisioningAttemptAt: completedAt,
      },
    });
    await prismadb.provisioningAuditLog.create({
      data: {
        targetId: target.id,
        initiatedByUserId: input.initiatedByUserId,
        operation: "seed_admin",
        outcome: "failed",
        correlationId,
        sanitizedMessage: result.error,
      },
    });
    return { seeded: false, message: result.error };
  }

  const { data } = result;
  const provStatus =
    data.status === "already_exists"
      ? VentureProvisioningStatus.already_exists
      : VentureProvisioningStatus.succeeded;

  await prismadb.provisioningOperation.update({
    where: { idempotencyKey },
    data: {
      status: "succeeded",
      completedAt,
      sanitizedResult: {
        status: data.status,
        message: data.message,
        adminEmail: data.adminEmail,
      },
    },
  });

  await prismadb.ventureApplicationTarget.update({
    where: { id: target.id },
    data: {
      provisioningStatus: provStatus,
      healthStatus: VentureTargetHealth.reachable,
      administratorEmail: input.adminEmail,
      lastProvisioningAttemptAt: completedAt,
      lastProvisioningSuccessAt: completedAt,
      lastConnectionTestAt: completedAt,
    },
  });

  if (data.status === "failed") {
    await prismadb.provisioningAuditLog.create({
      data: {
        targetId: target.id,
        initiatedByUserId: input.initiatedByUserId,
        operation: "seed_admin",
        outcome: "failed",
        correlationId,
        sanitizedMessage: data.message,
      },
    });
    return { seeded: false, message: data.message };
  }

  await prismadb.provisioningAuditLog.create({
    data: {
      targetId: target.id,
      initiatedByUserId: input.initiatedByUserId,
      operation: "seed_admin",
      outcome: data.status,
      correlationId,
      sanitizedMessage: data.message,
    },
  });

  return {
    seeded: true,
    status: data.status,
    message: data.message,
    adminPortalUrl: target.deploymentUrl.replace(/\/+$/, ""),
  };
}
