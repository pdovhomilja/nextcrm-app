import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getContact } from "@/actions/crm/get-contact";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContactSuiteContext, setupContactSuite, teardownContactSuite } from "../helpers/contacts";

describe("get contact by id", () => {
  let ctx: ContactSuiteContext;
  let softDeletedId: string;

  beforeAll(async () => {
    ctx = await setupContactSuite("pico002");
    setSessionCookie(ctx.session.cookie);

    const ghost = await prismadb.crm_Contacts.create({
      data: {
        v: 0,
        first_name: "PICO-002",
        last_name: "soft-deleted",
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
    await prismadb.crm_Contacts.delete({ where: { id: softDeletedId } });
    await teardownContactSuite(ctx);
  });

  it("returns the contact when it exists and is active", {
    meta: {
      id: "PICO-005",
      endpoint: "Server Action: getContact",
      objective: "Verificar que se retorne la información del contacto activo al solicitarlo por un identificador existente",
      expectedStatus: "Datos de contacto recuperados exitosamente",
      params: { id: "ctx.contact.id" },
      notes: "Recuperación exitosa de contacto activo"
    }
  }, async () => {
    const result = await getContact(ctx.contact.id);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(ctx.contact.id);
    expect(result?.last_name).toBe(ctx.contact.last_name);
  });

  it("returns null for a non-existent id", {
    meta: {
      id: "PICO-006",
      endpoint: "Server Action: getContact",
      objective: "Verificar que la acción de servidor retorne nulo al solicitar un contacto con un identificador inexistente",
      expectedStatus: "Retorno nulo",
      params: { id: "00000000-0000-0000-0000-000000000999" },
      notes: "Búsqueda de contacto inexistente"
    }
  }, async () => {
    const result = await getContact("00000000-0000-0000-0000-000000000999");
    expect(result).toBeNull();
  });

  it("returns null for a soft-deleted contact", {
    meta: {
      id: "PICO-007",
      endpoint: "Server Action: getContact",
      objective: "Verificar que la acción de servidor retorne nulo al solicitar un contacto que ha sido eliminado lógicamente",
      expectedStatus: "Retorno nulo",
      params: { id: "softDeletedId" },
      notes: "Exclusión de contactos eliminados lógicamente"
    }
  }, async () => {
    const result = await getContact(softDeletedId);
    expect(result).toBeNull();
  });
});
