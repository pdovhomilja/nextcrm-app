import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { updateActivity } from "@/actions/crm/activities/update-activity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ActivitySuiteContext, setupActivitySuite, teardownActivitySuite } from "../helpers/activities";

describe("change activity status", () => {
  let ctx: ActivitySuiteContext;
  let activityId: string;

  beforeAll(async () => {
    ctx = await setupActivitySuite("piact005");
    setSessionCookie(ctx.session.cookie);

    const createResult = await createActivity({
      type: "meeting",
      title: "PIACT-005 Meeting",
      date: new Date(),
      status: "scheduled",
      links: [{ entityType: "account", entityId: ctx.account.id }],
    });
    expect(createResult.error).toBeUndefined();
    activityId = createResult.data?.id;
  });

  afterAll(async () => {
    await teardownActivitySuite(ctx);
  });

  it("updates status to completed", {
    meta: {
      id: "PIACT-010",
      endpoint: "Server Action: updateActivity",
      objective: "Validar que la acción de servidor permita cambiar el estado de la actividad a completado",
      expectedStatus: "Estado completado guardado en la base de datos",
      body: { id: "activityId", status: "completed" },
      notes: "Cambio de estado a completado",
    },
  }, async () => {
    const updateResult = await updateActivity({
      id: activityId,
      status: "completed",
    });
    expect(updateResult.error).toBeUndefined();

    const row = await prismadb.crm_Activities.findUnique({
      where: { id: activityId },
      select: { status: true },
    });
    expect(row?.status).toBe("completed");
  });

  it("updates status to cancelled", {
    meta: {
      id: "PIACT-011",
      endpoint: "Server Action: updateActivity",
      objective: "Validar que la acción de servidor permita cambiar el estado de la actividad a cancelado",
      expectedStatus: "Estado cancelado guardado en la base de datos",
      body: { id: "activityId", status: "cancelled" },
      notes: "Cambio de estado a cancelado",
    },
  }, async () => {
    const updateResult = await updateActivity({
      id: activityId,
      status: "cancelled",
    });
    expect(updateResult.error).toBeUndefined();

    const row = await prismadb.crm_Activities.findUnique({
      where: { id: activityId },
      select: { status: true },
    });
    expect(row?.status).toBe("cancelled");
  });
});
