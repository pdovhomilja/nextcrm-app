import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createOpportunity } from "@/actions/crm/opportunities/create-opportunity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { inngestSpy } from "../helpers/inngest";
import {
  type OpportunitySuiteContext,
  setupOpportunitySuite,
  teardownOpportunitySuite,
} from "../helpers/opportunities";

describe("create opportunity with valid data", () => {
  let ctx: OpportunitySuiteContext;
  let createdId: string | null = null;

  beforeAll(async () => {
    ctx = await setupOpportunitySuite("piop001");
    setSessionCookie(ctx.session.cookie);

    const result = await createOpportunity({
      name: "PIOP-001 Test Opportunity",
      account: ctx.account.id,
      sales_stage: ctx.stageId,
      budget: "15000.00",
      expected_revenue: "1500.00",
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    createdId = result.data?.id ?? null;
  });

  afterAll(async () => {
    if (createdId) {
      await prismadb.crm_Opportunities.delete({ where: { id: createdId } });
    }
    await teardownOpportunitySuite(ctx);
  });

  it("returns a data payload with the new opportunity id", {
    meta: {
      id: "PIOP-001",
      endpoint: "Server Action: createOpportunity",
      objective:
        "Verificar que la acción de servidor retorne un identificador válido al crear una oportunidad comercial con datos correctos",
      expectedStatus: "Identificador de oportunidad generado",
      body: {
        name: "PIOP-001 Test Opportunity",
        account: "ctx.account.id",
        sales_stage: "ctx.stageId",
        budget: "15000.00",
        expected_revenue: "1500.00",
      },
      notes: "Creación exitosa de oportunidad",
    },
  }, () => {
    expect(createdId).toBeTruthy();
  });

  it("persists the opportunity row in crm_Opportunities", {
    meta: {
      id: "PIOP-002",
      endpoint: "Server Action: createOpportunity",
      objective:
        "Validar que la oportunidad creada se almacene correctamente en la base de datos con los valores provistos",
      expectedStatus: "Oportunidad persistida en crm_Opportunities",
      notes: "Persistencia correcta de la oportunidad en base de datos",
    },
  }, async () => {
    const row = await prismadb.crm_Opportunities.findUnique({
      where: { id: createdId ?? "" },
      select: { id: true, name: true, budget: true, expected_revenue: true, createdBy: true, account: true },
    });
    expect(row).not.toBeNull();
    expect(row?.name).toBe("PIOP-001 Test Opportunity");
    expect(row?.account).toBe(ctx.account.id);
    expect(row?.createdBy).toBe(ctx.ownerId);
    expect(row?.budget.toString()).toBe("15000");
    expect(row?.expected_revenue.toString()).toBe("1500");
  });

  it("writes an audit-log entry with action=created", {
    meta: {
      id: "PIOP-003",
      endpoint: "Server Action: createOpportunity",
      objective:
        "Validar que se registre una entrada en el registro de auditoría con la acción de creación correspondiente a la oportunidad",
      expectedStatus: "Entrada de auditoría creada",
      notes: "Auditoría de creación de oportunidad",
    },
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "opportunity", entityId: createdId ?? "", action: "created" },
      select: { id: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
  });

  it("dispatches the crm/opportunity.saved Inngest event", {
    meta: {
      id: "PIOP-004",
      endpoint: "Server Action: createOpportunity",
      objective: "Verificar el envío del evento de oportunidad guardada a través del despachador de eventos Inngest",
      expectedStatus: "Evento despachado correctamente",
      notes: "Validación de eventos en modo de simulación",
    },
  }, () => {
    const calls = inngestSpy.send.mock.calls.filter(
      (c) => (c[0] as { name?: string })?.name === "crm/opportunity.saved",
    );
    expect(calls.length).toBeGreaterThan(0);
    expect((calls[0]?.[0] as { data?: { record_id?: string } })?.data?.record_id).toBe(createdId);
  });
});
