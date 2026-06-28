import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { getAccountById } from "@/actions/crm/accounts/get-account-by-id";
import { prismadb } from "@/lib/prisma";
import { registerIntegrationMocks, setSessionCookie } from "../__utils__/setup";
import { type AccountSuiteContext, setupAccountSuite, teardownAccountSuite } from "../helpers/accounts";

registerIntegrationMocks();

describe("soft-delete account", () => {
  let ctx: AccountSuiteContext;
  let deletedAt: Date | null = null;

  beforeAll(async () => {
    ctx = await setupAccountSuite("piac004");
    setSessionCookie(ctx.session.cookie);

    const result = await deleteAccount(ctx.account.id);
    expect(result.error, `unexpected error: ${result.error}`).toBeUndefined();
    expect(result.success).toBe(true);
  });

  afterAll(async () => {
    await teardownAccountSuite(ctx);
  });

  it("sets deletedAt and deletedBy on the row", {
    meta: {
      id: "PIAC-010",
      endpoint: "Server Action: deleteAccount",
      objective: "Validar que la eliminación lógica registre el momento y el usuario que realiza la baja de la cuenta",
      expectedStatus: "Fecha y usuario de eliminación registrados",
      params: { id: "ctx.account.id" },
      notes: "Eliminación lógica exitosa"
    }
  }, async () => {
    const row = await prismadb.crm_Accounts.findUnique({
      where: { id: ctx.account.id },
      select: { deletedAt: true, deletedBy: true },
    });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.deletedBy).toBe(ctx.ownerId);
    deletedAt = row?.deletedAt ?? null;
  });

  it("writes an audit-log entry with action=deleted", {
    meta: {
      id: "PIAC-011",
      endpoint: "Server Action: deleteAccount",
      objective: "Validar que la eliminación lógica escriba un registro de auditoría con la acción de eliminado",
      expectedStatus: "Entrada de auditoría creada con éxito",
      notes: "Auditoría de eliminación lógica"
    }
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "account", entityId: ctx.account.id, action: "deleted" },
      orderBy: { createdAt: "desc" },
      select: { userId: true, createdAt: true },
    });
    expect(log, "audit log entry must exist after deleteAccount").not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
    if (deletedAt) {
      expect(log?.createdAt.getTime()).toBeGreaterThanOrEqual(deletedAt.getTime() - 1000);
    }
  });

  it("removes the account from getAccountById results", {
    meta: {
      id: "PIAC-012",
      endpoint: "Server Action: deleteAccount",
      objective: "Verificar que la cuenta eliminada lógicamente no pueda ser recuperada por consultas directas activas",
      expectedStatus: "Retorno nulo al buscar cuenta eliminada",
      notes: "Validación de exclusión activa de cuenta eliminada"
    }
  }, async () => {
    const result = await getAccountById(ctx.account.id);
    expect(result).toBeNull();
  });
});
