import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createContact } from "@/actions/crm/contacts/create-contact";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ContactSuiteContext, setupContactSuite, teardownContactSuite } from "../helpers/contacts";
import { inngestSpy } from "../helpers/inngest";

describe("create contact with valid data", () => {
  let ctx: ContactSuiteContext;
  let createdId: string | null = null;

  beforeAll(async () => {
    ctx = await setupContactSuite("pico001");
    setSessionCookie(ctx.session.cookie);

    const result = await createContact({
      first_name: "PICO-001",
      last_name: "Test Contact",
      email: "pico001@example.test",
      assigned_account: ctx.account.id,
    });
    expect(result).toBeDefined();
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    createdId = result.data?.id ?? null;
  });

  afterAll(async () => {
    if (createdId) {
      await prismadb.crm_Contacts.delete({ where: { id: createdId } });
    }
    await teardownContactSuite(ctx);
  });

  it("returns a data payload with the new contact id", {
    meta: {
      id: "PICO-001",
      endpoint: "Server Action: createContact",
      objective:
        "Verificar que la acción de servidor retorne un identificador válido al crear un contacto con datos correctos",
      expectedStatus: "Identificador de contacto generado",
      body: {
        first_name: "PICO-001",
        last_name: "Test Contact",
        email: "pico001@example.test",
        assigned_account: "ctx.account.id",
      },
      notes: "Creación exitosa de contacto",
    },
  }, () => {
    expect(createdId).toBeTruthy();
  });

  it("persists the contact row in crm_Contacts", {
    meta: {
      id: "PICO-002",
      endpoint: "Server Action: createContact",
      objective:
        "Validar que el contacto creado se almacene correctamente en la base de datos con los valores provistos",
      expectedStatus: "Contacto persistido en crm_Contacts",
      notes: "Persistencia correcta de contacto en base de datos",
    },
  }, async () => {
    const row = await prismadb.crm_Contacts.findUnique({
      where: { id: createdId ?? "" },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        status: true,
        createdBy: true,
        accountsIDs: true,
      },
    });
    expect(row).not.toBeNull();
    expect(row?.first_name).toBe("PICO-001");
    expect(row?.last_name).toBe("Test Contact");
    expect(row?.email).toBe("pico001@example.test");
    expect(row?.status).toBe(true);
    expect(row?.createdBy).toBe(ctx.ownerId);
    expect(row?.accountsIDs).toBe(ctx.account.id);
  });

  it("writes an audit-log entry with action=created", {
    meta: {
      id: "PICO-003",
      endpoint: "Server Action: createContact",
      objective:
        "Validar que se registre una entrada en el registro de auditoría con la acción de creación correspondiente al contacto",
      expectedStatus: "Entrada de auditoría creada",
      notes: "Auditoría de creación de contacto",
    },
  }, async () => {
    const log = await prismadb.crm_AuditLog.findFirst({
      where: { entityType: "contact", entityId: createdId ?? "", action: "created" },
      select: { id: true, userId: true },
    });
    expect(log).not.toBeNull();
    expect(log?.userId).toBe(ctx.ownerId);
  });

  it("dispatches the crm/contact.saved Inngest event", {
    meta: {
      id: "PICO-004",
      endpoint: "Server Action: createContact",
      objective: "Verificar el envío del evento de contacto guardado a través del despachador de eventos Inngest",
      expectedStatus: "Evento despachado correctamente",
      notes: "Validación de eventos en modo de simulación",
    },
  }, () => {
    const calls = inngestSpy.send.mock.calls.filter((c) => (c[0] as { name?: string })?.name === "crm/contact.saved");
    expect(calls.length).toBeGreaterThan(0);
    expect((calls[0]?.[0] as { data?: { record_id?: string } })?.data?.record_id).toBe(createdId);
  });

  it("maps empty string assigned_account to null instead of crashing PostgreSQL", {
    meta: {
      id: "PICO-015",
      endpoint: "Server Action: createContact",
      objective:
        "Verificar que el sistema convierta una cuenta asignada vacía en nulo sin generar un error en base de datos",
      expectedStatus: "Contacto creado con cuenta asignada nula",
      notes: "Error de formato: UUID vacío",
    },
  }, async () => {
    const result = await createContact({
      first_name: "NullAccount",
      last_name: "Contact",
      assigned_account: "",
    });
    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    if (result.data?.id) {
      await prismadb.crm_Contacts.delete({ where: { id: result.data.id } });
    }
  });

  it("rejects creation with non-existent assigned_account", {
    meta: {
      id: "PICO-017",
      endpoint: "Server Action: createContact",
      objective:
        "Verificar que el sistema rechace la creación del contacto si la cuenta asociada no existe en base de datos",
      expectedStatus: "Error de clave foránea / no encontrado",
      notes: "Error de integridad referencial: relación inexistente",
    },
  }, async () => {
    const result = await createContact({
      first_name: "GhostAccount",
      last_name: "Contact",
      assigned_account: "00000000-0000-0000-0000-000000000000",
    });
    expect(result.error).toBeDefined();
  });
});
