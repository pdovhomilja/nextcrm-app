import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { restoreAccount } from "@/actions/crm/accounts/restore-account";
import { getAccounts } from "@/actions/crm/get-accounts";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

describe("restore soft deleted entity", () => {
  let session: IntegrationSession;
  let accountId: string | null = null;

  beforeAll(async () => {
    session = await signInAsAdmin();
    setSessionCookie(session.cookie);

    const result = await createAccount({
      name: "PISD-003 Test Account",
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    accountId = result.data?.id ?? null;

    const deleteResult = await deleteAccount(accountId ?? "");
    expect(deleteResult.error).toBeUndefined();

    const restoreResult = await restoreAccount(accountId ?? "");
    expect(restoreResult.error).toBeUndefined();
    expect(restoreResult.success).toBe(true);
  });

  afterAll(async () => {
    if (accountId) {
      await prismadb.crm_AuditLog.deleteMany({
        where: { entityType: "account", entityId: accountId },
      });
      await prismadb.crm_Accounts.delete({ where: { id: accountId } });
    }
  });

  it("clears deletedAt and deletedBy fields in database", {
    meta: {
      id: "PISD-003",
      endpoint: "Server Action: restoreAccount",
      objective:
        "Validar que la restauración de la cuenta limpie la fecha y el usuario que realizó la baja lógica en la base de datos",
      expectedStatus: "Campos deletedAt y deletedBy reseteados a nulo",
      params: { id: "accountId" },
      notes: "Restauración exitosa de entidad",
    },
  }, async () => {
    expect(accountId).toBeTruthy();
    const row = await prismadb.crm_Accounts.findUnique({
      where: { id: accountId ?? "" },
      select: { deletedAt: true, deletedBy: true },
    });
    expect(row?.deletedAt).toBeNull();
    expect(row?.deletedBy).toBeNull();
  });

  it("includes the restored account in active accounts listing", {
    meta: {
      id: "PISD-004",
      endpoint: "Server Action: restoreAccount",
      objective: "Validar que la cuenta restaurada vuelva a aparecer en el listado general de cuentas activas",
      expectedStatus: "Cuenta restaurada presente en el listado",
      notes: "Validación de visibilidad de entidad restaurada",
    },
  }, async () => {
    expect(accountId).toBeTruthy();
    const list = await getAccounts();
    const ids = list.map((a) => a.id);
    expect(ids).toContain(accountId);
  });
});
