import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getLead } from "@/actions/crm/get-lead";
import { deleteLead } from "@/actions/crm/leads/delete-lead";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type LeadSuiteContext, setupLeadSuite, teardownLeadSuite } from "../helpers/leads";

describe("soft-delete lead", () => {
  let ctx: LeadSuiteContext;
  let deletedAt: Date | null = null;

  beforeAll(async () => {
    ctx = await setupLeadSuite("pile004");
    setSessionCookie(ctx.session.cookie);

    const result = await deleteLead(ctx.lead.id);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });

  afterAll(async () => {
    await teardownLeadSuite(ctx);
  });

  it("sets deletedAt and deletedBy on the row", {
    meta: {
      id: "PILE-010",
      endpoint: "Server Action: deleteLead",
      objective: "Validar que la eliminación lógica registre el momento y el usuario que realiza la baja del lead",
      expectedStatus: "Fecha y usuario de eliminación registrados",
      params: { id: "ctx.lead.id" },
      notes: "Eliminación lógica exitosa",
    },
  }, async () => {
    const row = await prismadb.crm_Leads.findUnique({
      where: { id: ctx.lead.id },
      select: { deletedAt: true, deletedBy: true },
    });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.deletedBy).toBe(ctx.ownerId);
    deletedAt = row?.deletedAt ?? null;
  });

  it("writes an audit-log entry with action=deleted", {
    meta: {
      id: "PILE-011",
      endpoint: "Server Action: deleteLead",
      objective:
        "Validar que la eliminación lógica escriba un registro de auditoría con la acción de eliminado para el lead",
      expectedStatus: "Entrada de auditoría creada con éxito",
      notes: "Auditoría de eliminación lógica",
    },
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "lead", entityId: ctx.lead.id, action: "deleted" },
      orderBy: { createdAt: "desc" },
      select: { userId: true, createdAt: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
    if (deletedAt) {
      expect(log?.createdAt.getTime()).toBeGreaterThanOrEqual(deletedAt.getTime() - 1000);
    }
  });

  it("removes the lead from getLead results", {
    meta: {
      id: "PILE-012",
      endpoint: "Server Action: deleteLead",
      objective: "Verificar que el lead eliminado lógicamente no pueda ser recuperado por consultas directas activas",
      expectedStatus: "Retorno nulo al buscar lead eliminado",
      notes: "Validación de exclusión activa de lead eliminado",
    },
  }, async () => {
    const result = await getLead(ctx.lead.id);
    expect(result).toBeNull();
  });
});
