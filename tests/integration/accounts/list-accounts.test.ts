import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAccounts } from "@/actions/crm/accounts/get-accounts";
import { prismadb } from "@/lib/prisma";
import { registerIntegrationMocks, setSessionCookie } from "../__utils__/setup";
import { type AccountSuiteContext, setupAccountSuite, teardownAccountSuite } from "../helpers/accounts";

registerIntegrationMocks();

describe("list accounts", () => {
  let ctx: AccountSuiteContext;
  let softDeletedId: string;

  beforeAll(async () => {
    ctx = await setupAccountSuite("piac007");
    setSessionCookie(ctx.session.cookie);

    const ghost = await prismadb.crm_Accounts.create({
      data: {
        v: 0,
        name: "PIAC-007 should-not-appear",
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

  it("returns a { data: [{id, name}] } payload sorted by name asc", {
    meta: {
      id: "PIAC-019",
      endpoint: "Server Action: getAccounts",
      objective: "Verificar que la acción de servidor retorne un listado de cuentas ordenadas alfabéticamente de forma ascendente por su nombre",
      expectedStatus: "Listado de cuentas ordenadas",
      notes: "Validación de ordenamiento ascendente"
    }
  }, async () => {
    const result = await getAccounts();
    expect(result.error, `unexpected error: ${result.error}`).toBeUndefined();
    expect(Array.isArray(result.data)).toBe(true);

    const names = (result.data ?? []).map((a) => a.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("includes the suite's fixture account in the listing", {
    meta: {
      id: "PIAC-020",
      endpoint: "Server Action: getAccounts",
      objective: "Confirmar que la consulta liste la cuenta creada en los datos del entorno de pruebas",
      expectedStatus: "Cuenta de fixture incluida en el listado",
      notes: "Validación de presencia de datos activos"
    }
  }, async () => {
    const result = await getAccounts();
    const found = (result.data ?? []).find((a) => a.id === ctx.account.id);
    expect(found?.name).toBe(ctx.account.name);
  });

  it("excludes soft-deleted accounts", {
    meta: {
      id: "PIAC-021",
      endpoint: "Server Action: getAccounts",
      objective: "Validar que las cuentas eliminadas lógicamente sean omitidas del listado general de cuentas",
      expectedStatus: "Cuentas eliminadas lógicamente ausentes en el listado",
      notes: "Validación de filtrado de eliminación lógica"
    }
  }, async () => {
    const result = await getAccounts();
    const found = (result.data ?? []).find((a) => a.id === softDeletedId);
    expect(found).toBeUndefined();
  });
});
