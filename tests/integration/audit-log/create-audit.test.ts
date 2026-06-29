import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

describe("verify creation audit log", () => {
  let session: IntegrationSession;
  let accountId: string | null = null;

  beforeAll(async () => {
    session = await signInAsAdmin();
    setSessionCookie(session.cookie);

    const result = await createAccount({
      name: "PIAL-001 Test Account",
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    accountId = result.data?.id ?? null;
  });

  afterAll(async () => {
    if (accountId) {
      await prismadb.crm_AuditLog.deleteMany({
        where: { entityType: "account", entityId: accountId },
      });
      await prismadb.crm_Accounts.delete({ where: { id: accountId } });
    }
  });

  it("persists a created audit log entry in database", {
    meta: {
      id: "PIAL-001",
      endpoint: "Server Action: createAccount",
      objective:
        "Validar que la creación de una cuenta registre correctamente una entrada de auditoría con la acción de creado en la base de datos",
      expectedStatus: "Registro de auditoría de creación persistido",
      notes: "Registro automático de auditoría al crear entidad",
    },
  }, async () => {
    expect(accountId).toBeTruthy();
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "account", entityId: accountId ?? "", action: "created" },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(session.userId);
    expect(log?.changes).toBeNull();
  });
});
