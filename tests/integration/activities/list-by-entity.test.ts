import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { getActivitiesByEntity } from "@/actions/crm/activities/get-activities-by-entity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { uniqueSuffix } from "../fixtures/builders";
import { type ActivitySuiteContext, setupActivitySuite, teardownActivitySuite } from "../helpers/activities";

describe("list activities by entity", () => {
  let ctx: ActivitySuiteContext;
  let activityOlderId: string;
  let activityNewerId: string;

  beforeAll(async () => {
    ctx = await setupActivitySuite("piact006");
    setSessionCookie(ctx.session.cookie);

    const oldResult = await createActivity({
      type: "note",
      title: "PIACT-006 Older Note",
      date: new Date("2026-06-24T10:00:00Z"),
      status: "completed",
      links: [{ entityType: "account", entityId: ctx.account.id }],
    });
    expect(oldResult.error).toBeUndefined();
    activityOlderId = oldResult.data?.id;

    const newResult = await createActivity({
      type: "note",
      title: "PIACT-006 Newer Note",
      date: new Date("2026-06-24T11:00:00Z"),
      status: "completed",
      links: [{ entityType: "account", entityId: ctx.account.id }],
    });
    expect(newResult.error).toBeUndefined();
    activityNewerId = newResult.data?.id;
  });

  afterAll(async () => {
    await teardownActivitySuite(ctx);
  });

  it("lists activities in descending date order (newest first)", {
    meta: {
      id: "PIACT-012",
      endpoint: "Server Action: getActivitiesByEntity",
      objective: "Confirmar que el listado de actividades de una entidad retorne ordenado en sentido descendente por fecha",
      expectedStatus: "Listado de actividades ordenadas por fecha de forma descendente",
      notes: "Validación de ordenamiento de actividades"
    }
  }, async () => {
    const result = await getActivitiesByEntity("account", ctx.account.id);
    expect(result.data.length).toBeGreaterThanOrEqual(2);

    const idxOlder = result.data.findIndex((a) => a.id === activityOlderId);
    const idxNewer = result.data.findIndex((a) => a.id === activityNewerId);

    expect(idxOlder).toBeGreaterThan(-1);
    expect(idxNewer).toBeGreaterThan(-1);
    expect(idxNewer).toBeLessThan(idxOlder);
  });

  it("does not include activities linked to other entities", {
    meta: {
      id: "PIACT-013",
      endpoint: "Server Action: getActivitiesByEntity",
      objective: "Validar que la consulta de actividades filtre y excluya aquellas actividades vinculadas a otras entidades diferentes",
      expectedStatus: "Actividades de otras entidades excluidas del listado",
      notes: "Validación de asilamiento de consultas de actividades"
    }
  }, async () => {
    const suffix = uniqueSuffix("piact006-other");
    const otherAccount = await prismadb.crm_Accounts.create({
      data: {
        name: `Other Account ${suffix}`,
        createdBy: ctx.ownerId,
        status: "Active",
        v: 0,
      },
    });

    const otherResult = await createActivity({
      type: "note",
      title: "PIACT-006 Other Note",
      date: new Date(),
      status: "completed",
      links: [{ entityType: "account", entityId: otherAccount.id }],
    });
    expect(otherResult.error).toBeUndefined();

    const list = await getActivitiesByEntity("account", ctx.account.id);
    const ids = list.data.map((a) => a.id);
    expect(ids).not.toContain(otherResult.data?.id);

    await prismadb.crm_ActivityLinks.deleteMany({ where: { activityId: otherResult.data?.id } });
    await prismadb.crm_Activities.delete({ where: { id: otherResult.data?.id } });
    await prismadb.crm_Accounts.delete({ where: { id: otherAccount.id } });
  });
});
