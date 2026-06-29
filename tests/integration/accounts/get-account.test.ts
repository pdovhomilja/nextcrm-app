import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAccountById } from "@/actions/crm/accounts/get-account-by-id";
import { prismadb } from "@/lib/prisma";
import { registerIntegrationMocks, setSessionCookie } from "../__utils__/setup";
import { type AccountSuiteContext, setupAccountSuite, teardownAccountSuite } from "../helpers/accounts";

registerIntegrationMocks();

describe("get account by id", () => {
  let ctx: AccountSuiteContext;
  let softDeletedId: string;

  beforeAll(async () => {
    ctx = await setupAccountSuite("piac002");
    setSessionCookie(ctx.session.cookie);

    const ghost = await prismadb.crm_Accounts.create({
      data: {
        v: 0,
        name: "PIAC-002 soft-deleted",
        createdBy: ctx.ownerId,
        updatedBy: ctx.ownerId,
        deletedAt: new Date(),
        deletedBy: ctx.ownerId,
      },
      select: { id: true },
    });
    softDeletedId = ghost.id;
  });

  afterAll(async () => {
    await prismadb.crm_Accounts.delete({ where: { id: softDeletedId } });
    await teardownAccountSuite(ctx);
  });

  it("returns the account when it exists and is active", {
    meta: {
      id: "PIAC-005",
      endpoint: "Server Action: getAccountById",
      objective: "Verificar que se retorne la información de la cuenta activa al solicitarla por un identificador existente",
      expectedStatus: "Datos de cuenta recuperados exitosamente",
      params: { id: "ctx.account.id" },
      notes: "Recuperación exitosa de cuenta activa"
    }
  }, async () => {
    const result = await getAccountById(ctx.account.id);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(ctx.account.id);
    expect(result?.name).toBe(ctx.account.name);
  });

  it("returns null for a non-existent id", {
    meta: {
      id: "PIAC-006",
      endpoint: "Server Action: getAccountById",
      objective: "Verificar que la acción de servidor retorne nulo al solicitar una cuenta con un identificador inexistente",
      expectedStatus: "Retorno nulo",
      params: { id: "00000000-0000-0000-0000-000000000999" },
      notes: "Búsqueda de cuenta inexistente"
    }
  }, async () => {
    const result = await getAccountById("00000000-0000-0000-0000-000000000999");
    expect(result).toBeNull();
  });

  it("returns null for a soft-deleted account", {
    meta: {
      id: "PIAC-007",
      endpoint: "Server Action: getAccountById",
      objective: "Verificar que la acción de servidor retorne nulo al solicitar una cuenta que ha sido eliminada lógicamente",
      expectedStatus: "Retorno nulo",
      params: { id: "softDeletedId" },
      notes: "Exclusión de cuentas eliminadas lógicamente"
    }
  }, async () => {
    const result = await getAccountById(softDeletedId);
    expect(result).toBeNull();
  });
});
