import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateOpportunity } from "@/actions/crm/opportunities/update-opportunity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import {
  type OpportunitySuiteContext,
  setupOpportunitySuite,
  teardownOpportunitySuite,
} from "../helpers/opportunities";

describe("update existing opportunity", () => {
  let ctx: OpportunitySuiteContext;
  const NEW_NAME = "PIOP-003-updated";
  const NEW_BUDGET = "20000.00";

  beforeAll(async () => {
    ctx = await setupOpportunitySuite("piop003");
    setSessionCookie(ctx.session.cookie);

    const result = await updateOpportunity({
      id: ctx.opportunity.id,
      name: NEW_NAME,
      budget: NEW_BUDGET,
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe(ctx.opportunity.id);
  });

  afterAll(async () => {
    await teardownOpportunitySuite(ctx);
  });

  it("persists the new field values", {
    meta: {
      id: "PIOP-008",
      endpoint: "Server Action: updateOpportunity",
      objective: "Validar que la acción de servidor persista los nuevos valores modificados de la oportunidad en la base de datos",
      expectedStatus: "Valores actualizados en base de datos",
      body: { id: "ctx.opportunity.id", name: "NEW_NAME", budget: "NEW_BUDGET" },
      notes: "Persistencia correcta de cambios"
    }
  }, async () => {
    const row = await prismadb.crm_Opportunities.findUnique({
      where: { id: ctx.opportunity.id },
      select: { name: true, budget: true, updatedBy: true },
    });
    expect(row?.name).toBe(NEW_NAME);
    expect(row?.budget.toString()).toBe("20000");
    expect(row?.updatedBy).toBe(ctx.ownerId);
  });

  it("writes an audit-log entry with action=updated and diff", {
    meta: {
      id: "PIOP-009",
      endpoint: "Server Action: updateOpportunity",
      objective: "Validar que la actualización de la oportunidad genere un registro de auditoría detallando los cambios realizados en cada campo",
      expectedStatus: "Registro de auditoría generado con los cambios",
      notes: "Auditoría de actualización detallada"
    }
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "opportunity", entityId: ctx.opportunity.id, action: "updated" },
      orderBy: { createdAt: "desc" },
      select: { changes: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);

    const changes = log?.changes as { field: string; old: unknown; new: unknown }[] | null;
    expect(Array.isArray(changes)).toBe(true);
    const fields = (changes ?? []).map((c) => c.field);
    expect(fields).toContain("name");
    expect(fields).toContain("budget");
  });
});
