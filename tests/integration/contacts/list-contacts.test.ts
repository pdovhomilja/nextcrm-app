import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getContactsByAccountId } from "@/actions/crm/get-contacts-by-accountId";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContactSuiteContext, setupContactSuite, teardownContactSuite } from "../helpers/contacts";

describe("list contacts by account", () => {
  let ctx: ContactSuiteContext;
  let softDeletedId: string;

  beforeAll(async () => {
    ctx = await setupContactSuite("pico005");
    setSessionCookie(ctx.session.cookie);

    const ghost = await prismadb.crm_Contacts.create({
      data: {
        v: 0,
        first_name: "PICO-005",
        last_name: "should-not-appear",
        accountsIDs: ctx.account.id,
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

  it("returns the active contacts associated with the account", {
    meta: {
      id: "PICO-013",
      endpoint: "Server Action: getContactsByAccountId",
      objective: "Confirmar que la consulta retorne los contactos activos que pertenecen a la cuenta especificada",
      expectedStatus: "Listado de contactos activos de la cuenta",
      params: { accountId: "ctx.account.id" },
      notes: "Validación de presencia de contactos asociados",
    },
  }, async () => {
    const result = await getContactsByAccountId(ctx.account.id);
    expect(Array.isArray(result)).toBe(true);
    const found = result.find((c) => c.id === ctx.contact.id);
    expect(found).toBeDefined();
    expect(found?.last_name).toBe(ctx.contact.last_name);
  });

  it("excludes soft-deleted contacts from the list", {
    meta: {
      id: "PICO-014",
      endpoint: "Server Action: getContactsByAccountId",
      objective:
        "Validar que los contactos de la cuenta que fueron eliminados lógicamente sean omitidos del listado retornado",
      expectedStatus: "Contactos eliminados lógicamente ausentes en el listado",
      notes: "Validación de filtrado de eliminación lógica para contactos",
    },
  }, async () => {
    const result = await getContactsByAccountId(ctx.account.id);
    const found = result.find((c) => c.id === softDeletedId);
    expect(found).toBeUndefined();
  });
});
