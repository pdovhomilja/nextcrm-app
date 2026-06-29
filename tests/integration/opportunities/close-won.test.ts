import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import {
  type OpportunitySuiteContext,
  setupOpportunitySuite,
  teardownOpportunitySuite,
} from "../helpers/opportunities";

describe("close opportunity as won", () => {
  let ctx: OpportunitySuiteContext;
  let wonStageId: string;

  beforeAll(async () => {
    ctx = await setupOpportunitySuite("piop005");
    setSessionCookie(ctx.session.cookie);

    const wonStage = await prismadb.crm_Opportunities_Sales_Stages.create({
      data: {
        name: "Closed Won PIOP-005",
        probability: 100,
      },
      select: { id: true },
    });
    wonStageId = wonStage.id;

    const result = await updateOpportunity({
      id: ctx.opportunity.id,
      sales_stage: wonStageId,
    });
    expect(result.error).toBeUndefined();
  });

  afterAll(async () => {
    await prismadb.crm_Opportunities_Sales_Stages.delete({ where: { id: wonStageId } });
    await teardownOpportunitySuite(ctx);
  });

  it("sets the sales stage to Closed Won", {
    meta: {
      id: "PIOP-012",
      endpoint: "Server Action: updateOpportunity",
      objective: "Validar que la oportunidad comercial pueda cerrarse como ganada estableciendo su etapa correspondiente",
      expectedStatus: "Etapa establecida en Closed Won",
      body: { id: "ctx.opportunity.id", sales_stage: "wonStageId" },
      notes: "Cierre exitoso como ganada"
    }
  }, async () => {
    const row = await prismadb.crm_Opportunities.findUnique({
      where: { id: ctx.opportunity.id },
      select: { sales_stage: true },
    });
    expect(row?.sales_stage).toBe(wonStageId);
  });

  it("writes an audit log tracking the Closed Won status", {
    meta: {
      id: "PIOP-013",
      endpoint: "Server Action: updateOpportunity",
      objective: "Validar que el cierre de la oportunidad como ganada escriba una entrada en la auditoría registrando el cambio de etapa",
      expectedStatus: "Auditoría de etapa Closed Won registrada con éxito",
      notes: "Auditoría de oportunidad ganada"
    }
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "opportunity", entityId: ctx.opportunity.id, action: "updated" },
      orderBy: { createdAt: "desc" },
      select: { changes: true },
    });
    expect(log).not.toBeNull();
    const changes = log?.changes as { field: string; old: unknown; new: unknown }[] | null;
    expect(Array.isArray(changes)).toBe(true);
    const fields = (changes ?? []).map((c) => c.field);
    expect(fields).toContain("sales_stage");
  });
});
