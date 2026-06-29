import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { convertTarget } from "@/actions/crm/targets/convert-target";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { uniqueSuffix } from "../fixtures/builders";
import { type LeadSuiteContext, setupLeadSuite, teardownLeadSuite } from "../helpers/leads";

describe("convert target to account and contact", () => {
  let ctx: LeadSuiteContext;
  let targetId: string;
  let accountId: string | null = null;
  let contactId: string | null = null;

  beforeAll(async () => {
    ctx = await setupLeadSuite("pile005");
    setSessionCookie(ctx.session.cookie);

    const suffix = uniqueSuffix("pile005-t");
    const target = await prismadb.crm_Targets.create({
      data: {
        first_name: "TargetFirstName",
        last_name: `TargetLastName-${suffix}`,
        company: `TargetCompany-${suffix}`,
        email: `target-${suffix}@example.test`,
        created_by: ctx.ownerId,
        updatedBy: ctx.ownerId,
      },
      select: { id: true },
    });
    targetId = target.id;

    const result = await convertTarget(targetId);
    expect(result).toBeDefined();
    if ("error" in result) {
      throw new Error(`convertTarget failed: ${result.error}`);
    }

    accountId = result.accountId;
    contactId = result.contactId;
  });

  afterAll(async () => {
    if (contactId) {
      await prismadb.crm_Contacts.delete({ where: { id: contactId } });
    }
    if (accountId) {
      await prismadb.crm_Accounts.delete({ where: { id: accountId } });
    }
    await prismadb.crm_Targets.delete({ where: { id: targetId } });
    await teardownLeadSuite(ctx);
  });

  it("returns the generated accountId and contactId", {
    meta: {
      id: "PILE-013",
      endpoint: "Server Action: convertTarget",
      objective: "Verificar que la conversión de un target retorne los identificadores correctos para la cuenta y contacto generados",
      expectedStatus: "Identificadores de cuenta y contacto retornados",
      params: { id: "targetId" },
      notes: "Conversión de target exitosa"
    }
  }, () => {
    expect(accountId).toBeTruthy();
    expect(contactId).toBeTruthy();
  });

  it("creates a matching account in the database", {
    meta: {
      id: "PILE-014",
      endpoint: "Server Action: convertTarget",
      objective: "Validar que el proceso de conversión de target cree y persista la cuenta con los datos de la compañía correspondientes",
      expectedStatus: "Cuenta persistida en la base de datos",
      notes: "Persistencia de cuenta convertida"
    }
  }, async () => {
    const acc = await prismadb.crm_Accounts.findUnique({
      where: { id: accountId ?? "" },
      select: { id: true, name: true, createdBy: true },
    });
    expect(acc).not.toBeNull();
    expect(acc?.name).toMatch(/^TargetCompany-pile005-t/);
    expect(acc?.createdBy).toBe(ctx.ownerId);
  });

  it("creates a matching contact in the database linked to the account", {
    meta: {
      id: "PILE-015",
      endpoint: "Server Action: convertTarget",
      objective: "Validar que el proceso de conversión de target cree y persista el contacto asociado a la cuenta creada",
      expectedStatus: "Contacto persistido y enlazado a la cuenta",
      notes: "Persistencia y enlace de contacto convertido"
    }
  }, async () => {
    const cnt = await prismadb.crm_Contacts.findUnique({
      where: { id: contactId ?? "" },
      select: { id: true, first_name: true, last_name: true, accountsIDs: true, createdBy: true },
    });
    expect(cnt).not.toBeNull();
    expect(cnt?.first_name).toBe("TargetFirstName");
    expect(cnt?.last_name).toMatch(/^TargetLastName-pile005-t/);
    expect(cnt?.accountsIDs).toBe(accountId);
    expect(cnt?.createdBy).toBe(ctx.ownerId);
  });

  it("updates the target to track conversion status", {
    meta: {
      id: "PILE-016",
      endpoint: "Server Action: convertTarget",
      objective: "Validar que se registren los identificadores de cuenta y contacto en la fila del target convertido para trazabilidad del estado",
      expectedStatus: "Target actualizado con identificadores de conversión",
      notes: "Trazabilidad de la conversión de target registrada"
    }
  }, async () => {
    const tgt = await prismadb.crm_Targets.findUnique({
      where: { id: targetId },
      select: { converted_at: true, converted_account_id: true, converted_contact_id: true },
    });
    expect(tgt?.converted_at).not.toBeNull();
    expect(tgt?.converted_account_id).toBe(accountId);
    expect(tgt?.converted_contact_id).toBe(contactId);
  });
});
