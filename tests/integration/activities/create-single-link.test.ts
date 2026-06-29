import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ActivitySuiteContext, setupActivitySuite, teardownActivitySuite } from "../helpers/activities";

describe("create activity linked to a single entity", () => {
  let ctx: ActivitySuiteContext;
  let createdActivityId: string | null = null;

  beforeAll(async () => {
    ctx = await setupActivitySuite("piact001");
    setSessionCookie(ctx.session.cookie);

    const result = await createActivity({
      type: "note",
      title: "PIACT-001 Test Note",
      description: "PIACT-001 Description",
      date: new Date(),
      status: "completed",
      links: [{ entityType: "account", entityId: ctx.account.id }],
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    createdActivityId = result.data?.id ?? null;
  });

  afterAll(async () => {
    await teardownActivitySuite(ctx);
  });

  it("persists the activity in crm_Activities with correct fields", {
    meta: {
      id: "PIACT-001",
      endpoint: "Server Action: createActivity",
      objective:
        "Validar que la acción de servidor persista la actividad de tipo nota vinculada a una única entidad en la base de datos",
      expectedStatus: "Actividad de tipo nota guardada con éxito",
      body: {
        type: "note",
        title: "PIACT-001 Test Note",
        description: "PIACT-001 Description",
        status: "completed",
        links: [{ entityType: "account", entityId: "ctx.account.id" }],
      },
      notes: "Persistencia exitosa de actividad con enlace único",
    },
  }, async () => {
    expect(createdActivityId).toBeTruthy();
    const row = await prismadb.crm_Activities.findUnique({
      where: { id: createdActivityId ?? "" },
    });
    expect(row).not.toBeNull();
    expect(row?.title).toBe("PIACT-001 Test Note");
    expect(row?.type).toBe("note");
    expect(row?.status).toBe("completed");
    expect(row?.createdBy).toBe(ctx.ownerId);
  });

  it("persists a single link in crm_ActivityLinks", {
    meta: {
      id: "PIACT-002",
      endpoint: "Server Action: createActivity",
      objective:
        "Validar que se registre correctamente la relación de la actividad con la entidad especificada en la tabla de enlaces",
      expectedStatus: "Enlace único de actividad persistido",
      notes: "Registro correcto de enlace",
    },
  }, async () => {
    expect(createdActivityId).toBeTruthy();
    const links = await prismadb.crm_ActivityLinks.findMany({
      where: { activityId: createdActivityId ?? "" },
    });
    expect(links.length).toBe(1);
    expect(links[0]?.entityType).toBe("account");
    expect(links[0]?.entityId).toBe(ctx.account.id);
  });

  it("rejects linking to a non-existent or soft-deleted entity", {
    meta: {
      id: "PIACT-019",
      endpoint: "Server Action: createActivity",
      objective:
        "Verificar que el sistema rechace la vinculación de actividades a entidades inexistentes o eliminadas lógicamente",
      expectedStatus: "Error: Entidad vinculada no encontrada o borrada",
      notes: "Error de integridad referencial: relación rota",
    },
  }, async () => {
    const resultNonExistent = await createActivity({
      type: "note",
      title: "Ghost Entity Act",
      date: new Date(),
      status: "completed",
      links: [{ entityType: "account", entityId: "00000000-0000-0000-0000-000000000000" }],
    });
    expect(resultNonExistent.error).toBeDefined();

    const deletedAccount = await prismadb.crm_Accounts.create({
      data: {
        v: 0,
        name: "PIACT-019 Soft Deleted Account",
        deletedAt: new Date(),
        deletedBy: ctx.ownerId,
        createdBy: ctx.ownerId,
        updatedBy: ctx.ownerId,
      },
    });

    const resultDeleted = await createActivity({
      type: "note",
      title: "Deleted Entity Act",
      date: new Date(),
      status: "completed",
      links: [{ entityType: "account", entityId: deletedAccount.id }],
    });

    await prismadb.crm_Accounts.delete({ where: { id: deletedAccount.id } });

    expect(resultDeleted.error).toBeDefined();
  });
});
