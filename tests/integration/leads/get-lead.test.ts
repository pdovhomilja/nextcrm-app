import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLead } from "@/actions/crm/get-lead";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type LeadSuiteContext, setupLeadSuite, teardownLeadSuite } from "../helpers/leads";

describe("get lead by id", () => {
  let ctx: LeadSuiteContext;
  let softDeletedId: string;

  beforeAll(async () => {
    ctx = await setupLeadSuite("pile002");
    setSessionCookie(ctx.session.cookie);

    const ghost = await prismadb.crm_Leads.create({
      data: {
        v: 0,
        firstName: "PILE-002",
        lastName: "soft-deleted",
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

  it("returns the lead when it exists and is active", {
    meta: {
      id: "PILE-005",
      endpoint: "Server Action: getLead",
      objective: "Verificar que se retorne la información del lead activo al solicitarlo por un identificador existente",
      expectedStatus: "Datos de lead recuperados exitosamente",
      params: { id: "ctx.lead.id" },
      notes: "Recuperación exitosa de lead activo"
    }
  }, async () => {
    const result = await getLead(ctx.lead.id);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(ctx.lead.id);
    expect(result?.lastName).toBe(ctx.lead.lastName);
  });

  it("returns null for a non-existent id", {
    meta: {
      id: "PILE-006",
      endpoint: "Server Action: getLead",
      objective: "Verificar que la acción de servidor retorne nulo al solicitar un lead con un identificador inexistente",
      expectedStatus: "Retorno nulo",
      params: { id: "00000000-0000-0000-0000-000000000999" },
      notes: "Búsqueda de lead inexistente"
    }
  }, async () => {
    const result = await getLead("00000000-0000-0000-0000-000000000999");
    expect(result).toBeNull();
  });

  it("returns null for a soft-deleted lead", {
    meta: {
      id: "PILE-007",
      endpoint: "Server Action: getLead",
      objective: "Verificar que la acción de servidor retorne nulo al solicitar un lead que ha sido eliminado lógicamente",
      expectedStatus: "Retorno nulo",
      params: { id: "softDeletedId" },
      notes: "Exclusión de leads eliminados lógicamente"
    }
  }, async () => {
    const result = await getLead(softDeletedId);
    expect(result).toBeNull();
  });
});
