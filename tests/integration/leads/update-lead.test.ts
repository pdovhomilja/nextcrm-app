import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateLead } from "@/actions/crm/leads/update-lead";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type LeadSuiteContext, setupLeadSuite, teardownLeadSuite } from "../helpers/leads";

describe("update existing lead", () => {
  let ctx: LeadSuiteContext;
  const NEW_FIRST_NAME = "PILE-003-updated";
  const NEW_COMPANY = "PILE-003 Updated Company";

  beforeAll(async () => {
    ctx = await setupLeadSuite("pile003");
    setSessionCookie(ctx.session.cookie);

    const result = await updateLead({
      id: ctx.lead.id,
      lastName: ctx.lead.lastName,
      firstName: NEW_FIRST_NAME,
      company: NEW_COMPANY,
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe(ctx.lead.id);
  });

  afterAll(async () => {
    await teardownLeadSuite(ctx);
  });

  it("persists the new field values", {
    meta: {
      id: "PILE-008",
      endpoint: "Server Action: updateLead",
      objective:
        "Validar que la acción de servidor persista los nuevos valores modificados del lead en la base de datos",
      expectedStatus: "Valores actualizados en base de datos",
      body: { id: "ctx.lead.id", firstName: "NEW_FIRST_NAME", company: "NEW_COMPANY" },
      notes: "Persistencia correcta de cambios",
    },
  }, async () => {
    const row = await prismadb.crm_Leads.findUnique({
      where: { id: ctx.lead.id },
      select: { firstName: true, company: true, updatedBy: true },
    });
    expect(row?.firstName).toBe(NEW_FIRST_NAME);
    expect(row?.company).toBe(NEW_COMPANY);
    expect(row?.updatedBy).toBe(ctx.ownerId);
  });

  it("writes an audit-log entry with action=updated and diff", {
    meta: {
      id: "PILE-009",
      endpoint: "Server Action: updateLead",
      objective:
        "Validar que la actualización del lead genere un registro de auditoría detallando los cambios realizados en cada campo",
      expectedStatus: "Registro de auditoría generado con los cambios",
      notes: "Auditoría de actualización detallada",
    },
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "lead", entityId: ctx.lead.id, action: "updated" },
      orderBy: { createdAt: "desc" },
      select: { changes: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);

    const changes = log?.changes as { field: string; old: unknown; new: unknown }[] | null;
    expect(Array.isArray(changes)).toBe(true);
    const fields = (changes ?? []).map((c) => c.field);
    expect(fields).toContain("firstName");
    expect(fields).toContain("company");
  });
});
