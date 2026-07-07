import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

describe("soft delete active entity", () => {
  let session: IntegrationSession;
  let accountId: string | null = null;

  beforeAll(async () => {
    session = await signInAsAdmin();
    setSessionCookie(session.cookie);

    const result = await createAccount({
      name: "PISD-001 Test Account",
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

  it("sets deletedAt and deletedBy fields on the account in database", {
    meta: {
      id: "PISD-001",
      endpoint: "Server Action: deleteAccount",
      objective:
        "Validar que la acción de eliminación lógica establezca la fecha y el usuario correspondiente en la entidad dentro de la base de datos",
      expectedStatus: "Campos deletedAt y deletedBy rellenados en base de datos",
      params: { id: "accountId" },
      notes: "Validación de metadatos de eliminación lógica",
    },
  }, async () => {
    expect(accountId).toBeTruthy();
    const row = await prismadb.crm_Accounts.findUnique({
      where: { id: accountId ?? "" },
      select: { deletedAt: true, deletedBy: true },
    });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.deletedBy).toBe(session.userId);
  });
});
