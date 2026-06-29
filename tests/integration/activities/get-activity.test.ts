import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ActivitySuiteContext, setupActivitySuite, teardownActivitySuite } from "../helpers/activities";

describe("get activity by entity", () => {
  let ctx: ActivitySuiteContext;
  let activeActivityId: string;
  let softDeletedActivityId: string;

  beforeAll(async () => {
    ctx = await setupActivitySuite("piact003");
    setSessionCookie(ctx.session.cookie);

    const activeResult = await createActivity({
      type: "call",
      title: "PIACT-003 Active Call",
      date: new Date(),
      status: "scheduled",
      links: [{ entityType: "account", entityId: ctx.account.id }],
    });
    expect(activeResult.error).toBeUndefined();
    activeActivityId = activeResult.data?.id;

    const ghost = await prismadb.crm_Activities.create({
      data: {
        type: "call",
        title: "PIACT-003 Deleted Call",
        date: new Date(),
        status: "scheduled",
        createdBy: ctx.ownerId,
        deletedAt: new Date(),
        deletedBy: ctx.ownerId,
      },
      select: { id: true },
    });
    softDeletedActivityId = ghost.id;

    await prismadb.crm_ActivityLinks.create({
      data: {
        activityId: softDeletedActivityId,
        entityType: "account",
        entityId: ctx.account.id,
      },
    });
  });

  afterAll(async () => {
    await prismadb.crm_ActivityLinks.deleteMany({
      where: { activityId: softDeletedActivityId },
    });
    await prismadb.crm_Activities.deleteMany({
      where: { id: softDeletedActivityId },
    });
    await teardownActivitySuite(ctx);
  });

  it("returns active activities linked to the entity", {
    meta: {
      id: "PIACT-005",
      endpoint: "Server Action: getActivitiesByEntity",
      objective: "Confirmar que la consulta retorne las actividades activas asociadas a la entidad especificada",
      expectedStatus: "Listado de actividades activas vinculadas",
      params: { entityType: "account", entityId: "ctx.account.id" },
      notes: "Validación de recuperación de actividades"
    }
  }, async () => {
    const result = await getActivitiesByEntity("account", ctx.account.id);
    expect(result.data).toBeDefined();
    const ids = result.data.map((act) => act.id);
    expect(ids).toContain(activeActivityId);
  });

  it("excludes soft-deleted activities from the list", {
    meta: {
      id: "PIACT-006",
      endpoint: "Server Action: getActivitiesByEntity",
      objective: "Validar que las actividades asociadas a la entidad que fueron eliminadas lógicamente sean omitidas de los resultados",
      expectedStatus: "Actividades eliminadas lógicamente ausentes en el listado",
      notes: "Validación de filtrado de eliminación lógica para actividades"
    }
  }, async () => {
    const result = await getActivitiesByEntity("account", ctx.account.id);
    const ids = result.data.map((act) => act.id);
    expect(ids).not.toContain(softDeletedActivityId);
  });

  it("returns an empty list for a non-existent entity", {
    meta: {
      id: "PIACT-007",
      endpoint: "Server Action: getActivitiesByEntity",
      objective: "Verificar que la consulta retorne una estructura vacía sin cursor al solicitar actividades para un identificador de entidad inexistente",
      expectedStatus: "Listado vacío y cursor nulo",
      params: { entityType: "account", entityId: "00000000-0000-0000-0000-000000000999" },
      notes: "Búsqueda en entidad inexistente"
    }
  }, async () => {
    const result = await getActivitiesByEntity("account", "00000000-0000-0000-0000-000000000999");
    expect(result.data).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
