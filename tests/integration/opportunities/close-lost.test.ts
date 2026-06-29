import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import {
  type OpportunitySuiteContext,
  setupOpportunitySuite,
  teardownOpportunitySuite,
} from "../helpers/opportunities";

describe("close opportunity as lost", () => {
  let ctx: OpportunitySuiteContext;
  let lostStageId: string;

  beforeAll(async () => {
    ctx = await setupOpportunitySuite("piop006");
    setSessionCookie(ctx.session.cookie);

    const lostStage = await prismadb.crm_Opportunities_Sales_Stages.create({
      data: {
        name: "Closed Lost PIOP-006",
        probability: 0,
      },
      select: { id: true },
    });
    lostStageId = lostStage.id;

    const result = await updateOpportunity({
      id: ctx.opportunity.id,
      sales_stage: lostStageId,
    });
    expect(result.error).toBeUndefined();
  });

  afterAll(async () => {
    await prismadb.crm_Opportunities_Sales_Stages.delete({ where: { id: lostStageId } });
    await teardownOpportunitySuite(ctx);
  });

  it("sets the sales stage to Closed Lost", {
    meta: {
      id: "PIOP-014",
      endpoint: "Server Action: updateOpportunity",
      objective: "Validar que la oportunidad comercial pueda cerrarse como perdida estableciendo su etapa correspondiente",
      expectedStatus: "Etapa establecida en Closed Lost",
      body: { id: "ctx.opportunity.id", sales_stage: "lostStageId" },
      notes: "Cierre exitoso como perdida"
    }
  }, async () => {
    const row = await prismadb.crm_Opportunities.findUnique({
      where: { id: ctx.opportunity.id },
      select: { sales_stage: true },
    });
    expect(row?.sales_stage).toBe(lostStageId);
  });

  it("writes an audit log tracking the Closed Lost status", {
    meta: {
      id: "PIOP-015",
      endpoint: "Server Action: updateOpportunity",
      objective: "Validar que el cierre de la oportunidad como perdida escriba una entrada en la auditoría registrando el cambio de etapa",
      expectedStatus: "Auditoría de etapa Closed Lost registrada con éxito",
      notes: "Auditoría de oportunidad perdida"
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
