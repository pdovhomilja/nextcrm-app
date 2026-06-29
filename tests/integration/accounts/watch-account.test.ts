import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unwatchAccount } from "@/actions/crm/accounts/unwatch-account";
import { watchAccount } from "@/actions/crm/accounts/watch-account";
import { prismadb } from "@/lib/prisma";
import { registerIntegrationMocks, setSessionCookie } from "../__utils__/setup";
import { type AccountSuiteContext, setupAccountSuite, teardownAccountSuite } from "../helpers/accounts";

registerIntegrationMocks();

describe("watch / unwatch account", () => {
  let ctx: AccountSuiteContext;

  beforeAll(async () => {
    ctx = await setupAccountSuite("piac006");
    setSessionCookie(ctx.session.cookie);
  });

  afterAll(async () => {
    await teardownAccountSuite(ctx);
  });

  it("watchAccount creates a row in AccountWatchers", {
    meta: {
      id: "PIAC-017",
      endpoint: "Server Action: watchAccount",
      objective: "Validar que la acción de observar cuenta registre correctamente la relación en la tabla de observadores de cuentas",
      expectedStatus: "Registro creado en AccountWatchers",
      body: { account_id: "ctx.account.id" },
      notes: "Registro exitoso de observación de cuenta"
    }
  }, async () => {
    const result = await watchAccount(ctx.account.id);
    expect(result.error, `unexpected error: ${result.error}`).toBeUndefined();
    expect(result.success).toBe(true);

    const row = await prismadb.accountWatchers.findUnique({
      where: {
        account_id_user_id: {
          account_id: ctx.account.id,
          user_id: ctx.ownerId,
        },
      },
      select: { account_id: true, user_id: true },
    });
    expect(row).not.toBeNull();
    expect(row?.account_id).toBe(ctx.account.id);
    expect(row?.user_id).toBe(ctx.ownerId);
  });

  it("unwatchAccount removes the row from AccountWatchers", {
    meta: {
      id: "PIAC-018",
      endpoint: "Server Action: unwatchAccount",
      objective: "Validar que la acción de dejar de observar cuenta elimine correctamente el registro de la tabla de observadores de cuentas",
      expectedStatus: "Registro eliminado de AccountWatchers",
      body: { account_id: "ctx.account.id" },
      notes: "Remoción exitosa de observación de cuenta"
    }
  }, async () => {
    const result = await unwatchAccount(ctx.account.id);
    expect(result.error, `unexpected error: ${result.error}`).toBeUndefined();
    expect(result.success).toBe(true);

    const row = await prismadb.accountWatchers.findUnique({
      where: {
        account_id_user_id: {
          account_id: ctx.account.id,
          user_id: ctx.ownerId,
        },
      },
    });
    expect(row).toBeNull();
  });
});
