import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getOpportunity } from "@/actions/crm/get-opportunity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import {
  type OpportunitySuiteContext,
  setupOpportunitySuite,
  teardownOpportunitySuite,
} from "../helpers/opportunities";

describe("get opportunity by id", () => {
  let ctx: OpportunitySuiteContext;
  let softDeletedId: string;

  beforeAll(async () => {
    ctx = await setupOpportunitySuite("piop002");
    setSessionCookie(ctx.session.cookie);

    const ghost = await prismadb.crm_Opportunities.create({
      data: {
        name: "PIOP-002 soft-deleted",
        createdBy: ctx.ownerId,
        updatedBy: ctx.ownerId,
        deletedAt: new Date(),
        deletedBy: ctx.ownerId,
        budget: 0,
        expected_revenue: 0,
      },
      select: { id: true },
    });
    softDeletedId = ghost.id;
  });

  afterAll(async () => {
    await prismadb.crm_Opportunities.delete({ where: { id: softDeletedId } });
    await teardownOpportunitySuite(ctx);
  });

  it("returns the opportunity when it exists and is active", {
    meta: {
      id: "PIOP-005",
      endpoint: "Server Action: getOpportunity",
      objective:
        "Verificar que se retorne la información de la oportunidad activa al solicitarla por un identificador existente",
      expectedStatus: "Datos de la oportunidad recuperados exitosamente",
      params: { id: "ctx.opportunity.id" },
      notes: "Recuperación exitosa de oportunidad activa",
    },
  }, async () => {
    const result = await getOpportunity(ctx.opportunity.id);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(ctx.opportunity.id);
    expect(result?.name).toBe(ctx.opportunity.name);
  });

  it("returns null for a non-existent id", {
    meta: {
      id: "PIOP-006",
      endpoint: "Server Action: getOpportunity",
      objective:
        "Verificar que la acción de servidor retorne nulo al solicitar una oportunidad con un identificador inexistente",
      expectedStatus: "Retorno nulo",
      params: { id: "00000000-0000-0000-0000-000000000999" },
      notes: "Búsqueda de oportunidad inexistente",
    },
  }, async () => {
    const result = await getOpportunity("00000000-0000-0000-0000-000000000999");
    expect(result).toBeNull();
  });

  it("returns null for a soft-deleted opportunity", {
    meta: {
      id: "PIOP-007",
      endpoint: "Server Action: getOpportunity",
      objective:
        "Verificar que la acción de servidor retorne nulo al solicitar una oportunidad que ha sido eliminada lógicamente",
      expectedStatus: "Retorno nulo",
      params: { id: "softDeletedId" },
      notes: "Exclusión de oportunidades eliminadas lógicamente",
    },
  }, async () => {
    const result = await getOpportunity(softDeletedId);
    expect(result).toBeNull();
  });
});
