import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateAccount } from "@/actions/crm/accounts/update-account";
import { prismadb } from "@/lib/prisma";
import { registerIntegrationMocks, setSessionCookie } from "../__utils__/setup";
import { type AccountSuiteContext, setupAccountSuite, teardownAccountSuite } from "../helpers/accounts";

registerIntegrationMocks();

describe("update existing account", () => {
  let ctx: AccountSuiteContext;
  const NEW_NAME = `PIAC-003 updated ${Date.now()}`;
  const NEW_PHONE = "+51 1 555 0300";

  beforeAll(async () => {
    ctx = await setupAccountSuite("piac003");
    setSessionCookie(ctx.session.cookie);

    const result = await updateAccount({
      id: ctx.account.id,
      name: NEW_NAME,
      office_phone: NEW_PHONE,
      billing_city: "Arequipa",
    });
    expect(result.error, `unexpected error: ${result.error}`).toBeUndefined();
    expect(result.data?.id).toBe(ctx.account.id);
  });

  afterAll(async () => {
    await teardownAccountSuite(ctx);
  });

  it("persists the new field values", {
    meta: {
      id: "PIAC-008",
      endpoint: "Server Action: updateAccount",
      objective:
        "Validar que la acción de servidor persista los nuevos valores modificados de la cuenta en la base de datos",
      expectedStatus: "Valores actualizados en base de datos",
      body: { id: "ctx.account.id", name: "NEW_NAME", office_phone: "NEW_PHONE", billing_city: "Arequipa" },
      notes: "Persistencia correcta de cambios",
    },
  }, async () => {
    const row = await prismadb.crm_Accounts.findUnique({
      where: { id: ctx.account.id },
      select: { name: true, office_phone: true, billing_city: true, updatedBy: true },
    });
    expect(row?.name).toBe(NEW_NAME);
    expect(row?.office_phone).toBe(NEW_PHONE);
    expect(row?.billing_city).toBe("Arequipa");
    expect(row?.updatedBy).toBe(ctx.ownerId);
  });

  it("writes an audit-log entry with action=updated and a non-empty diff", {
    meta: {
      id: "PIAC-009",
      endpoint: "Server Action: updateAccount",
      objective:
        "Validar que la actualización de la cuenta genere un registro de auditoría detallando los cambios realizados en cada campo",
      expectedStatus: "Registro de auditoría generado con los cambios",
      notes: "Auditoría de actualización detallada",
    },
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "account", entityId: ctx.account.id, action: "updated" },
      orderBy: { createdAt: "desc" },
      select: { changes: true, userId: true },
    });
    expect(log, "audit log entry must exist after updateAccount").not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);

    const changes = log?.changes as { field: string; old: unknown; new: unknown }[] | null;
    expect(Array.isArray(changes)).toBe(true);
    const fields = (changes ?? []).map((c) => c.field);
    expect(fields).toContain("name");
    expect(fields).toContain("office_phone");
    expect(fields).toContain("billing_city");
  });
});
