import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLeads } from "@/actions/crm/get-leads";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type LeadSuiteContext, setupLeadSuite, teardownLeadSuite } from "../helpers/leads";

describe("list leads", () => {
  let ctx: LeadSuiteContext;
  let softDeletedId: string;

  beforeAll(async () => {
    ctx = await setupLeadSuite("pile006");
    setSessionCookie(ctx.session.cookie);

    const ghost = await prismadb.crm_Leads.create({
      data: {
        v: 0,
        firstName: "PILE-006",
        lastName: "should-not-appear",
        createdBy: ctx.ownerId,
        updatedBy: ctx.ownerId,
        deletedAt: new Date(),
        deletedBy: ctx.ownerId,
      },
      select: { id: true },
    });
    softDeletedId = ghost.id;
  });

  afterAll(async () => {
    await prismadb.crm_Leads.delete({ where: { id: softDeletedId } });
    await teardownLeadSuite(ctx);
  });

  it("returns active leads including the suite's fixture lead", {
    meta: {
      id: "PILE-017",
      endpoint: "Server Action: getLeads",
      objective: "Confirmar que la consulta retorne los leads activos en el sistema incluyendo el lead del fixture",
      expectedStatus: "Listado de leads activos con el lead del fixture incluido",
      notes: "Validación de presencia de leads activos"
    }
  }, async () => {
    const result = await getLeads();
    expect(Array.isArray(result)).toBe(true);
    const found = result.find((l) => l.id === ctx.lead.id);
    expect(found).toBeDefined();
    expect(found?.lastName).toBe(ctx.lead.lastName);
  });

  it("excludes soft-deleted leads from the listing", {
    meta: {
      id: "PILE-018",
      endpoint: "Server Action: getLeads",
      objective: "Validar que los leads que fueron eliminados lógicamente sean omitidos del listado retornado",
      expectedStatus: "Leads eliminados lógicamente ausentes en el listado",
      notes: "Validación de filtrado de eliminación lógica para leads"
    }
  }, async () => {
    const result = await getLeads();
    const found = result.find((l) => l.id === softDeletedId);
    expect(found).toBeUndefined();
  });
});
