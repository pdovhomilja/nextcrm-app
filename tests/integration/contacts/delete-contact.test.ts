import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { deleteContact } from "@/actions/crm/contacts/delete-contact";
import { getContact } from "@/actions/crm/get-contact";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContactSuiteContext, setupContactSuite, teardownContactSuite } from "../helpers/contacts";

describe("soft-delete contact", () => {
  let ctx: ContactSuiteContext;
  let deletedAt: Date | null = null;

  beforeAll(async () => {
    ctx = await setupContactSuite("pico004");
    setSessionCookie(ctx.session.cookie);

    const result = await deleteContact(ctx.contact.id);
    expect(result.error).toBeUndefined();
    expect(result.success).toBe(true);
  });

  afterAll(async () => {
    await teardownContactSuite(ctx);
  });

  it("sets deletedAt and deletedBy on the row", {
    meta: {
      id: "PICO-010",
      endpoint: "Server Action: deleteContact",
      objective: "Validar que la eliminación lógica registre el momento y el usuario que realiza la baja del contacto",
      expectedStatus: "Fecha y usuario de eliminación registrados",
      params: { id: "ctx.contact.id" },
      notes: "Eliminación lógica exitosa"
    }
  }, async () => {
    const row = await prismadb.crm_Contacts.findUnique({
      where: { id: ctx.contact.id },
      select: { deletedAt: true, deletedBy: true },
    });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.deletedBy).toBe(ctx.ownerId);
    deletedAt = row?.deletedAt ?? null;
  });

  it("writes an audit-log entry with action=deleted", {
    meta: {
      id: "PICO-011",
      endpoint: "Server Action: deleteContact",
      objective: "Validar que la eliminación lógica escriba un registro de auditoría con la acción de eliminado para el contacto",
      expectedStatus: "Entrada de auditoría creada con éxito",
      notes: "Auditoría de eliminación lógica"
    }
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "contact", entityId: ctx.contact.id, action: "deleted" },
      orderBy: { createdAt: "desc" },
      select: { userId: true, createdAt: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
    if (deletedAt) {
      expect(log?.createdAt.getTime()).toBeGreaterThanOrEqual(deletedAt.getTime() - 1000);
    }
  });

  it("removes the contact from getContact results", {
    meta: {
      id: "PICO-012",
      endpoint: "Server Action: deleteContact",
      objective: "Verificar que el contacto eliminado lógicamente no pueda ser recuperado por consultas directas activas",
      expectedStatus: "Retorno nulo al buscar contacto eliminado",
      notes: "Validación de exclusión activa de contacto eliminado"
    }
  }, async () => {
    const result = await getContact(ctx.contact.id);
    expect(result).toBeNull();
  });
});
