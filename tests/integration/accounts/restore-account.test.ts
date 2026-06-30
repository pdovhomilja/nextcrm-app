import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { getAccountById } from "@/actions/crm/accounts/get-account-by-id";
import { restoreAccount } from "@/actions/crm/accounts/restore-account";
import { prismadb } from "@/lib/prisma";
import { registerIntegrationMocks, setSessionCookie } from "../__utils__/setup";
import { type AccountSuiteContext, setupAccountSuite, teardownAccountSuite } from "../helpers/accounts";

registerIntegrationMocks();

describe("restore account with admin role", () => {
  let ctx: AccountSuiteContext;
  let originalRole: string | null = null;

  beforeAll(async () => {
    ctx = await setupAccountSuite("piac005");
    setSessionCookie(ctx.session.cookie);

    const del = await deleteAccount(ctx.account.id);
    expect(del.error).toBeUndefined();
  });

  afterAll(async () => {
    if (originalRole !== null) {
      await prismadb.users.update({
        where: { id: ctx.ownerId },
        data: { role: originalRole as "admin" | "manager" | "user" },
      });
    }
    await teardownAccountSuite(ctx);
  });

  it("returns success: true and clears deletedAt/deletedBy", {
    meta: {
      id: "PIAC-013",
      endpoint: "Server Action: restoreAccount",
      objective:
        "Validar que la restauración de la cuenta por un usuario administrador retorne éxito y limpie los campos de eliminación lógica",
      expectedStatus: "Campos de eliminación lógica reseteados a nulo",
      params: { id: "ctx.account.id" },
      notes: "Restauración exitosa de cuenta",
    },
  }, async () => {
    const result = await restoreAccount(ctx.account.id);
    expect(result.error, `unexpected error: ${result.error}`).toBeUndefined();
    expect(result.success).toBe(true);

    const row = await prismadb.crm_Accounts.findUnique({
      where: { id: ctx.account.id },
      select: { deletedAt: true, deletedBy: true },
    });
    expect(row?.deletedAt).toBeNull();
    expect(row?.deletedBy).toBeNull();
  });

  it("writes an audit-log entry with action=restored", {
    meta: {
      id: "PIAC-014",
      endpoint: "Server Action: restoreAccount",
      objective:
        "Validar que la restauración de la cuenta escriba un registro de auditoría con la acción de restaurado",
      expectedStatus: "Entrada de auditoría de restauración creada con éxito",
      notes: "Auditoría de restauración de cuenta",
    },
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "account", entityId: ctx.account.id, action: "restored" },
      orderBy: { createdAt: "desc" },
      select: { userId: true },
    });
    expect(log, "audit log entry must exist after restoreAccount").not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
  });

  it("makes the account visible via getAccountById again", {
    meta: {
      id: "PIAC-015",
      endpoint: "Server Action: restoreAccount",
      objective: "Confirmar que la cuenta restaurada vuelva a estar visible para consultas activas ordinarias",
      expectedStatus: "Cuenta visible para búsquedas activas",
      notes: "Validación de visibilidad de cuenta activa",
    },
  }, async () => {
    const result = await getAccountById(ctx.account.id);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(ctx.account.id);
  });

  it("rejects the restore when the session user is not admin", {
    meta: {
      id: "PIAC-016",
      endpoint: "Server Action: restoreAccount",
      objective:
        "Verificar que el sistema rechace la restauración de la cuenta y mantenga su estado eliminado cuando el usuario no posee el rol de administrador",
      expectedStatus: "Error Forbidden y estado eliminado persistente",
      notes: "Restricción de seguridad por rol de usuario",
    },
  }, async () => {
    const before = await prismadb.users.findUnique({
      where: { id: ctx.ownerId },
      select: { role: true },
    });
    originalRole = before?.role ?? null;
    await prismadb.users.update({
      where: { id: ctx.ownerId },
      data: { role: "user" },
    });

    await prismadb.crm_Accounts.update({
      where: { id: ctx.account.id },
      data: { deletedAt: new Date(), deletedBy: ctx.ownerId },
    });

    const result = await restoreAccount(ctx.account.id);
    expect(result.error).toBe("Forbidden");
    expect(result.success).toBeUndefined();

    const row = await prismadb.crm_Accounts.findUnique({
      where: { id: ctx.account.id },
      select: { deletedAt: true },
    });
    expect(row?.deletedAt).not.toBeNull();
  });

  it("rejects restoring an account that is not deleted", {
    meta: {
      id: "PIAC-029",
      endpoint: "Server Action: restoreAccount",
      objective: "Verificar que el sistema rechace la restauración de una cuenta que no está eliminada",
      expectedStatus: "Error de validación: cuenta no eliminada",
      notes: "Violación de regla de negocio: restaurar recurso activo",
    },
  }, async () => {
    await prismadb.crm_Accounts.update({
      where: { id: ctx.account.id },
      data: { deletedAt: null, deletedBy: null },
    });

    const result = await restoreAccount(ctx.account.id);
    expect(result.error).toBeDefined();
  });
});
