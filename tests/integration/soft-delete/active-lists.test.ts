import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { getAccounts } from "@/actions/crm/get-accounts";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

describe("filter soft deleted entities from active lists", () => {
  let session: IntegrationSession;
  let accountId: string | null = null;

  beforeAll(async () => {
    session = await signInAsAdmin();
    setSessionCookie(session.cookie);

    const result = await createAccount({
      name: "PISD-002 Test Account",
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    accountId = result.data?.id ?? null;

    const deleteResult = await deleteAccount(accountId ?? "");
    expect(deleteResult.error).toBeUndefined();
  });

  afterAll(async () => {
    if (accountId) {
      await prismadb.crm_AuditLog.deleteMany({
        where: { entityType: "account", entityId: accountId },
      });
      await prismadb.crm_Accounts.delete({ where: { id: accountId } });
    }
  });

  it("does not include the soft deleted account in active accounts listing", {
    meta: {
      id: "PISD-002",
      endpoint: "Server Action: getAccounts",
      objective: "Validar que el listado general de cuentas excluya aquellas que han sido dadas de baja de forma lógica",
      expectedStatus: "Cuenta eliminada lógicamente ausente en el listado",
      notes: "Validación de exclusión lógica en consultas generales"
    }
  }, async () => {
    expect(accountId).toBeTruthy();
    const list = await getAccounts();
    const ids = list.map((a) => a.id);
    expect(ids).not.toContain(accountId);
  });
});
