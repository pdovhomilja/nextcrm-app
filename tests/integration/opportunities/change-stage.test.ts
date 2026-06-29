import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import {
  type OpportunitySuiteContext,
  setupOpportunitySuite,
  teardownOpportunitySuite,
} from "../helpers/opportunities";

describe("change pipeline stage of opportunity", () => {
  let ctx: OpportunitySuiteContext;
  let newStageId: string;

  beforeAll(async () => {
    ctx = await setupOpportunitySuite("piop004");
    setSessionCookie(ctx.session.cookie);

    const newStage = await prismadb.crm_Opportunities_Sales_Stages.create({
      data: {
        name: "Proposal Stage PIOP-004",
        probability: 50,
      },
      select: { id: true },
    });
    newStageId = newStage.id;

    const result = await updateOpportunity({
      id: ctx.opportunity.id,
      sales_stage: newStageId,
    });
    expect(result.error).toBeUndefined();
  });

  afterAll(async () => {
    await prismadb.crm_Opportunities_Sales_Stages.delete({ where: { id: newStageId } });
    await teardownOpportunitySuite(ctx);
  });

  it("updates the sales stage of the opportunity", {
    meta: {
      id: "PIOP-010",
      endpoint: "Server Action: updateOpportunity",
      objective: "Validar que la acción de servidor actualice correctamente la etapa de venta de la oportunidad comercial",
      expectedStatus: "Etapa de venta actualizada en la base de datos",
      body: { id: "ctx.opportunity.id", sales_stage: "newStageId" },
      notes: "Cambio de etapa de venta exitoso"
    }
  }, async () => {
    const row = await prismadb.crm_Opportunities.findUnique({
      where: { id: ctx.opportunity.id },
      select: { sales_stage: true },
    });
    expect(row?.sales_stage).toBe(newStageId);
  });

  it("writes an audit-log entry tracking the stage change", {
    meta: {
      id: "PIOP-011",
      endpoint: "Server Action: updateOpportunity",
      objective: "Validar que el cambio de etapa de venta registre una entrada de auditoría específica para el campo de la etapa",
      expectedStatus: "Auditoría de cambio de etapa creada con éxito",
      notes: "Auditoría de cambio de etapa comercial"
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
