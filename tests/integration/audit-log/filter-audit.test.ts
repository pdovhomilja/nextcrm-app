import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { updateAccount } from "@/actions/crm/accounts/update-account";
import { getAuditLogAdmin } from "@/actions/crm/audit-log/get-audit-log-admin";
import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type IntegrationSession, signInAsAdmin } from "../helpers/auth";

describe("filter audit logs", () => {
  let session: IntegrationSession;
  let accountId: string | null = null;

  beforeAll(async () => {
    session = await signInAsAdmin();
    setSessionCookie(session.cookie);

    const createResult = await createAccount({
      name: "PIAL-003 Test Account",
    });
    expect(createResult.error).toBeUndefined();
    accountId = createResult.data?.id ?? null;

    const updateResult = await updateAccount({
      id: accountId ?? "",
      name: "PIAL-003 Test Account Updated",
    });
    expect(updateResult.error).toBeUndefined();
  });

  afterAll(async () => {
    if (accountId) {
      await prismadb.crm_AuditLog.deleteMany({
        where: { entityType: "account", entityId: accountId },
      });
      await prismadb.crm_Accounts.delete({ where: { id: accountId } });
    }
  });

  it("filters audit log entries by entity type and ID using getAuditLogByEntity", {
    meta: {
      id: "PIAL-003",
      endpoint: "Server Action: getAuditLogByEntity",
      objective:
        "Verificar que la consulta por tipo e identificador de entidad retorne exactamente el historial correspondiente",
      expectedStatus: "Historial de auditoría para la entidad específica retornado",
      params: { entityType: "account", entityId: "accountId" },
      notes: "Filtrado de auditoría por entidad",
    },
  }, async () => {
    expect(accountId).toBeTruthy();
    const result = await getAuditLogByEntity("account", accountId ?? "");
    expect(result.data).toBeDefined();
    expect(result.data.length).toBe(2);

    const actions = result.data.map((log: any) => log.action);
    expect(actions).toContain("created");
    expect(actions).toContain("updated");
  });

  it("filters audit log entries administratively using getAuditLogAdmin", {
    meta: {
      id: "PIAL-004",
      endpoint: "Server Action: getAuditLogAdmin",
      objective:
        "Verificar que la consulta administrativa de auditoría retorne correctamente los registros filtrados por tipo de entidad y usuario",
      expectedStatus: "Listado administrativo de auditoría retornado",
      body: { entityType: "account", userId: "session.userId" },
      notes: "Consulta administrativa global de auditoría",
    },
  }, async () => {
    expect(accountId).toBeTruthy();
    const result = await getAuditLogAdmin({
      entityType: "account",
      userId: session.userId,
    });
    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThanOrEqual(2);

    const matchIds = result.data.map((log: any) => log.entityId);
    expect(matchIds).toContain(accountId);
  });
});
