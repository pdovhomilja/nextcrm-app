import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { updateContact } from "@/actions/crm/contacts/update-contact";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContactSuiteContext, setupContactSuite, teardownContactSuite } from "../helpers/contacts";

describe("update existing contact", () => {
  let ctx: ContactSuiteContext;
  const NEW_FIRST_NAME = "PICO-003-updated";
  const NEW_EMAIL = "pico003_updated@example.test";

  beforeAll(async () => {
    ctx = await setupContactSuite("pico003");
    setSessionCookie(ctx.session.cookie);

    const result = await updateContact({
      id: ctx.contact.id,
      first_name: NEW_FIRST_NAME,
      email: NEW_EMAIL,
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBe(ctx.contact.id);
  });

  afterAll(async () => {
    await teardownContactSuite(ctx);
  });

  it("persists the new field values", {
    meta: {
      id: "PICO-008",
      endpoint: "Server Action: updateContact",
      objective: "Validar que la acción de servidor persista los nuevos valores modificados del contacto en la base de datos",
      expectedStatus: "Valores actualizados en base de datos",
      body: { id: "ctx.contact.id", first_name: "NEW_FIRST_NAME", email: "NEW_EMAIL" },
      notes: "Persistencia correcta de cambios"
    }
  }, async () => {
    const row = await prismadb.crm_Contacts.findUnique({
      where: { id: ctx.contact.id },
      select: { first_name: true, email: true, updatedBy: true },
    });
    expect(row?.first_name).toBe(NEW_FIRST_NAME);
    expect(row?.email).toBe(NEW_EMAIL);
    expect(row?.updatedBy).toBe(ctx.ownerId);
  });

  it("writes an audit-log entry with action=updated and diff", {
    meta: {
      id: "PICO-009",
      endpoint: "Server Action: updateContact",
      objective: "Validar que la actualización del contacto genere un registro de auditoría detallando los cambios realizados en cada campo",
      expectedStatus: "Registro de auditoría generado con los cambios",
      notes: "Auditoría de actualización detallada"
    }
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "contact", entityId: ctx.contact.id, action: "updated" },
      orderBy: { createdAt: "desc" },
      select: { changes: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);

    const changes = log?.changes as { field: string; old: unknown; new: unknown }[] | null;
    expect(Array.isArray(changes)).toBe(true);
    const fields = (changes ?? []).map((c) => c.field);
    expect(fields).toContain("first_name");
    expect(fields).toContain("email");
  });
});
