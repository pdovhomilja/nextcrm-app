import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { deleteActivity } from "@/actions/crm/activities/delete-activity";
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ActivitySuiteContext, setupActivitySuite, teardownActivitySuite } from "../helpers/activities";

describe("delete activity (soft delete)", () => {
  let ctx: ActivitySuiteContext;
  let activityId: string;

  beforeAll(async () => {
    ctx = await setupActivitySuite("piact007");
    setSessionCookie(ctx.session.cookie);

    const createResult = await createActivity({
      type: "note",
      title: "PIACT-007 Delete Me",
      date: new Date(),
      status: "completed",
      links: [{ entityType: "account", entityId: ctx.account.id }],
    });
    expect(createResult.error).toBeUndefined();
    activityId = createResult.data?.id;

    const deleteResult = await deleteActivity(activityId);
    expect(deleteResult.error).toBeUndefined();
    expect(deleteResult.success).toBe(true);
  });

  afterAll(async () => {
    await teardownActivitySuite(ctx);
  });

  it("sets deletedAt and deletedBy in crm_Activities", {
    meta: {
      id: "PIACT-014",
      endpoint: "Server Action: deleteActivity",
      objective: "Validar que la eliminación lógica de la actividad registre el momento y el usuario que realiza la baja",
      expectedStatus: "Fecha y usuario de eliminación registrados en crm_Activities",
      params: { id: "activityId" },
      notes: "Eliminación lógica exitosa"
    }
  }, async () => {
    const row = await prismadb.crm_Activities.findUnique({
      where: { id: activityId },
      select: { deletedAt: true, deletedBy: true },
    });
    expect(row?.deletedAt).not.toBeNull();
    expect(row?.deletedBy).toBe(ctx.ownerId);
  });

  it("excludes the deleted activity from getActivitiesByEntity listing", {
    meta: {
      id: "PIACT-015",
      endpoint: "Server Action: deleteActivity",
      objective: "Verificar que la actividad eliminada lógicamente no se muestre al solicitar el listado de actividades de la entidad",
      expectedStatus: "Actividad eliminada ausente en el listado",
      notes: "Validación de exclusión activa de actividad eliminada"
    }
  }, async () => {
    const result = await getActivitiesByEntity("account", ctx.account.id);
    const ids = result.data.map((a) => a.id);
    expect(ids).not.toContain(activityId);
  });
});
