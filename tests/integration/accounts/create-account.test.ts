import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAccount } from "@/actions/crm/accounts/create-account";
import { prismadb } from "@/lib/prisma";
import { registerIntegrationMocks, setSessionCookie } from "../__utils__/setup";
import { type AccountSuiteContext, setupAccountSuite, teardownAccountSuite } from "../helpers/accounts";
import { inngestSpy } from "../helpers/inngest";

registerIntegrationMocks();

describe("create account with valid data", () => {
  let ctx: AccountSuiteContext;
  let createdId: string | null = null;

  beforeAll(async () => {
    ctx = await setupAccountSuite("piac001");
    setSessionCookie(ctx.session.cookie);

    const result = await createAccount({
      name: `PIAC-001 ${Date.now()}`,
      office_phone: "+51 1 555 0100",
      email: "piac001@example.test",
      website: "https://piac001.example.test",
      billing_city: "Lima",
      billing_country: "Peru",
    });
    expect(result, "createAccount must not return undefined").toBeDefined();
    expect(result.error, `unexpected error: ${result.error}`).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    createdId = result.data?.id ?? null;
  });

  afterAll(async () => {
    if (createdId) {
      await prismadb.crm_Accounts.delete({ where: { id: createdId } });
    }
    await teardownAccountSuite(ctx);
  });

  it("returns a data payload with the new account id", {
    meta: {
      id: "PIAC-001",
      endpoint: "Server Action: createAccount",
      objective:
        "Verificar que la acción de servidor retorne un identificador válido al crear una cuenta con datos correctos",
      expectedStatus: "Identificador de cuenta generado",
      body: {
        name: "PIAC-001 + timestamp",
        office_phone: "+51 1 555 0100",
        email: "piac001@example.test",
        website: "https://piac001.example.test",
        billing_city: "Lima",
        billing_country: "Peru",
      },
      notes: "Creación exitosa de cuenta",
    },
  }, () => {
    expect(createdId).toBeTruthy();
  });

  it("persists the account row in crm_Accounts", {
    meta: {
      id: "PIAC-002",
      endpoint: "Server Action: createAccount",
      objective:
        "Validar que el registro de la cuenta creada se almacene correctamente en la base de datos con los valores provistos",
      expectedStatus: "Fila persistida en crm_Accounts",
      notes: "Persistencia correcta en base de datos",
    },
  }, async () => {
    const row = await prismadb.crm_Accounts.findUnique({
      where: { id: createdId ?? "" },
      select: { id: true, name: true, email: true, status: true, createdBy: true },
    });
    expect(row).not.toBeNull();
    expect(row?.name).toMatch(/^PIAC-001 /);
    expect(row?.email).toBe("piac001@example.test");
    expect(row?.status).toBe("Active");
    expect(row?.createdBy).toBe(ctx.ownerId);
  });

  it("writes an audit-log entry with action=created", {
    meta: {
      id: "PIAC-003",
      endpoint: "Server Action: createAccount",
      objective:
        "Validar que se registre una entrada en el registro de auditoría con la acción de creación correspondiente",
      expectedStatus: "Entrada de auditoría creada",
      notes: "Auditoría de creación exitosa",
    },
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "account", entityId: createdId ?? "", action: "created" },
      select: { id: true, userId: true, changes: true },
    });
    expect(log, "audit log entry must exist after createAccount").not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
  });

  it("dispatches the crm/account.saved Inngest event (stubbed)", {
    meta: {
      id: "PIAC-004",
      endpoint: "Server Action: createAccount",
      objective: "Verificar el envío del evento de cuenta guardada a través del despachador de eventos Inngest",
      expectedStatus: "Evento despachado correctamente",
      notes: "Validación de eventos en modo de simulación",
    },
  }, () => {
    const calls = inngestSpy.send.mock.calls.filter((c) => (c[0] as { name?: string })?.name === "crm/account.saved");
    expect(calls.length).toBeGreaterThan(0);
    expect((calls[0]?.[0] as { data?: { record_id?: string } })?.data?.record_id).toBe(createdId);
  });

  it("rejects creation with duplicate corporate email", {
    meta: {
      id: "PIAC-026",
      endpoint: "Server Action: createAccount",
      objective: "Verificar que el sistema rechace la creación de una cuenta con un correo corporativo duplicado",
      expectedStatus: "Error de conflicto: correo duplicado",
      notes: "Restricción de unicidad: correo duplicado",
    },
  }, async () => {
    const result = await createAccount({
      name: "Duplicate Email Account",
      email: "piac001@example.test",
    });
    expect(result.error).toBeDefined();
  });
});
