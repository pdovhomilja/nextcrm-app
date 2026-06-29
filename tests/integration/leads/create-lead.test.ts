import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLead } from "@/actions/crm/leads/create-lead";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { inngestSpy } from "../helpers/inngest";
import { type LeadSuiteContext, setupLeadSuite, teardownLeadSuite } from "../helpers/leads";

describe("create lead with valid data", () => {
  let ctx: LeadSuiteContext;
  let createdId: string | null = null;

  beforeAll(async () => {
    ctx = await setupLeadSuite("pile001");
    setSessionCookie(ctx.session.cookie);

    const result = await createLead({
      first_name: "PILE-001",
      last_name: "Test Lead",
      email: "pile001@example.test",
      company: "PILE-001 Company",
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    createdId = result.data?.id ?? null;
  });

  afterAll(async () => {
    if (createdId) {
      await prismadb.crm_Leads.delete({ where: { id: createdId } });
    }
    await teardownLeadSuite(ctx);
  });

  it("returns a data payload with the new lead id", {
    meta: {
      id: "PILE-001",
      endpoint: "Server Action: createLead",
      objective:
        "Verificar que la acción de servidor retorne un identificador válido al crear un lead con datos correctos",
      expectedStatus: "Identificador de lead generado",
      body: {
        first_name: "PILE-001",
        last_name: "Test Lead",
        email: "pile001@example.test",
        company: "PILE-001 Company",
      },
      notes: "Creación exitosa de lead",
    },
  }, () => {
    expect(createdId).toBeTruthy();
  });

  it("persists the lead row in crm_Leads", {
    meta: {
      id: "PILE-002",
      endpoint: "Server Action: createLead",
      objective: "Validar que el lead creado se almacene correctamente en la base de datos con los valores provistos",
      expectedStatus: "Lead persistido en crm_Leads",
      notes: "Persistencia correcta de lead en base de datos",
    },
  }, async () => {
    const row = await prismadb.crm_Leads.findUnique({
      where: { id: createdId ?? "" },
      select: { id: true, firstName: true, lastName: true, email: true, company: true, createdBy: true },
    });
    expect(row).not.toBeNull();
    expect(row?.firstName).toBe("PILE-001");
    expect(row?.lastName).toBe("Test Lead");
    expect(row?.email).toBe("pile001@example.test");
    expect(row?.company).toBe("PILE-001 Company");
    expect(row?.createdBy).toBe(ctx.ownerId);
  });

  it("writes an audit-log entry with action=created", {
    meta: {
      id: "PILE-003",
      endpoint: "Server Action: createLead",
      objective:
        "Validar que se registre una entrada en el registro de auditoría con la acción de creación correspondiente al lead",
      expectedStatus: "Entrada de auditoría creada",
      notes: "Auditoría de creación de lead",
    },
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "lead", entityId: createdId ?? "", action: "created" },
      select: { id: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
  });

  it("dispatches the crm/lead.saved Inngest event", {
    meta: {
      id: "PILE-004",
      endpoint: "Server Action: createLead",
      objective: "Verificar el envío del evento de lead guardado a través del despachador de eventos Inngest",
      expectedStatus: "Evento despachado correctamente",
      notes: "Validación de eventos en modo de simulación",
    },
  }, () => {
    const calls = inngestSpy.send.mock.calls.filter((c) => (c[0] as { name?: string })?.name === "crm/lead.saved");
    expect(calls.length).toBeGreaterThan(0);
    expect((calls[0]?.[0] as { data?: { record_id?: string } })?.data?.record_id).toBe(createdId);
  });

  it("rejects associating a lead to a soft-deleted account", {
    meta: {
      id: "PILE-020",
      endpoint: "Server Action: createLead",
      objective: "Verificar que el sistema rechace la vinculación de un lead a una cuenta eliminada lógicamente",
      expectedStatus: "Error de validación: cuenta asociada está borrada",
      notes: "Error de integridad referencial: relación con entidad inactiva",
    },
  }, async () => {
    const account = await prismadb.crm_Accounts.create({
      data: {
        v: 0,
        name: "PILE-020 Soft Deleted Account",
        deletedAt: new Date(),
        deletedBy: ctx.ownerId,
        createdBy: ctx.ownerId,
        updatedBy: ctx.ownerId,
      },
    });

    const result = await createLead({
      first_name: "Test",
      last_name: "Lead",
      company: "PILE-020 Company",
      accountIDs: account.id,
    });

    await prismadb.crm_Accounts.delete({ where: { id: account.id } });

    expect(result.error).toBeDefined();
  });
});
