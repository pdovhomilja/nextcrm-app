import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { updateAccount } from "@/actions/crm/accounts/update-account";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

describe("verify update audit log with diff changes", () => {
  let session: IntegrationSession;
  let accountId: string | null = null;

  beforeAll(async () => {
    session = await signInAsAdmin();
    setSessionCookie(session.cookie);

    const createResult = await createAccount({
      name: "PIAL-002 Test Account",
      website: "http://old.example.com",
    });
    expect(createResult.error).toBeUndefined();
    accountId = createResult.data?.id ?? null;

    const updateResult = await updateAccount({
      id: accountId ?? "",
      name: "PIAL-002 Test Account Updated",
      website: "http://new.example.com",
    });
    expect(updateResult.error).toBeUndefined();
  });

  afterAll(async () => {
    if (accountId) {
      await prismadb.crm_AuditLog.deleteMany({
        where: { entityType: "account", entityId: accountId },
      });
      await prismadb.crm_Accounts.delete({ where: { id: accountId } });
    }
  });

  it("persists an updated audit log entry in database with changes", {
    meta: {
      id: "PIAL-002",
      endpoint: "Server Action: updateAccount",
      objective:
        "Validar que la actualización de una cuenta registre en la auditoría el detalle específico de los valores anteriores y nuevos para cada campo modificado",
      expectedStatus: "Registro de auditoría de actualización con historial de cambios persistido",
      notes: "Registro automático de diferencias en la actualización",
    },
  }, async () => {
    expect(accountId).toBeTruthy();
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "account", entityId: accountId ?? "", action: "updated" },
      orderBy: { createdAt: "desc" },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(session.userId);

    const changes = log?.changes as { field: string; old: unknown; new: unknown }[] | null;
    expect(Array.isArray(changes)).toBe(true);

    const fields = (changes ?? []).map((c) => c.field);
    expect(fields).toContain("name");
    expect(fields).toContain("website");

    const nameChange = (changes ?? []).find((c) => c.field === "name");
    expect(nameChange?.old).toBe("PIAL-002 Test Account");
    expect(nameChange?.new).toBe("PIAL-002 Test Account Updated");
  });
});
