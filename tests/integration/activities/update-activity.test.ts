import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { updateActivity } from "@/actions/crm/activities/update-activity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ActivitySuiteContext, setupActivitySuite, teardownActivitySuite } from "../helpers/activities";

describe("update activity details and links", () => {
  let ctx: ActivitySuiteContext;
  let activityId: string;

  beforeAll(async () => {
    ctx = await setupActivitySuite("piact004");
    setSessionCookie(ctx.session.cookie);

    const createResult = await createActivity({
      type: "note",
      title: "PIACT-004 Original Title",
      date: new Date(),
      status: "scheduled",
      links: [{ entityType: "account", entityId: ctx.account.id }],
    });
    expect(createResult.error).toBeUndefined();
    activityId = createResult.data?.id;

    const updateResult = await updateActivity({
      id: activityId,
      title: "PIACT-004 Updated Title",
      status: "completed",
      links: [{ entityType: "contact", entityId: ctx.contact.id }],
    });
    expect(updateResult.error).toBeUndefined();
  });

  afterAll(async () => {
    await teardownActivitySuite(ctx);
  });

  it("persists updated fields in crm_Activities", {
    meta: {
      id: "PIACT-008",
      endpoint: "Server Action: updateActivity",
      objective: "Validar que la acción de servidor persista los nuevos valores modificados de la actividad en la base de datos",
      expectedStatus: "Valores actualizados en crm_Activities",
      body: { id: "activityId", title: "PIACT-004 Updated Title", status: "completed" },
      notes: "Persistencia correcta de cambios"
    }
  }, async () => {
    const row = await prismadb.crm_Activities.findUnique({
      where: { id: activityId },
    });
    expect(row).not.toBeNull();
    expect(row?.title).toBe("PIACT-004 Updated Title");
    expect(row?.status).toBe("completed");
  });

  it("updates links by deleting old ones and adding the new ones", {
    meta: {
      id: "PIACT-009",
      endpoint: "Server Action: updateActivity",
      objective: "Validar que la actualización de la actividad remueva los enlaces anteriores y asocie los nuevos enlaces provistos",
      expectedStatus: "Enlaces actualizados en crm_ActivityLinks",
      notes: "Reemplazo de enlaces de actividad"
    }
  }, async () => {
    const links = await prismadb.crm_ActivityLinks.findMany({
      where: { activityId },
    });
    expect(links.length).toBe(1);
    expect(links[0]?.entityType).toBe("contact");
    expect(links[0]?.entityId).toBe(ctx.contact.id);
  });
});
