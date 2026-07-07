import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createActivity } from "@/actions/crm/activities/create-activity";
import { prismadb } from "@/lib/prisma";
import { setSessionCookie } from "../__utils__/setup";
import { type ActivitySuiteContext, setupActivitySuite, teardownActivitySuite } from "../helpers/activities";

describe("create activity linked to multiple entities simultaneously", () => {
  let ctx: ActivitySuiteContext;
  let createdActivityId: string | null = null;

  beforeAll(async () => {
    ctx = await setupActivitySuite("piact002");
    setSessionCookie(ctx.session.cookie);

    const result = await createActivity({
      type: "meeting",
      title: "PIACT-002 Test Meeting",
      description: "PIACT-002 Description",
      date: new Date(),
      status: "scheduled",
      links: [
        { entityType: "account", entityId: ctx.account.id },
        { entityType: "contact", entityId: ctx.contact.id },
        { entityType: "opportunity", entityId: ctx.opportunity.id },
      ],
    });

    expect(result.error).toBeUndefined();
    expect(result.data?.id).toBeTruthy();
    createdActivityId = result.data?.id ?? null;
  });

  afterAll(async () => {
    await teardownActivitySuite(ctx);
  });

  it("persists the activity row in database", {
    meta: {
      id: "PIACT-003",
      endpoint: "Server Action: createActivity",
      objective:
        "Validar que la acción de servidor persista la actividad de tipo reunión vinculada a múltiples entidades en la base de datos",
      expectedStatus: "Actividad de tipo reunión guardada con éxito",
      body: {
        type: "meeting",
        title: "PIACT-002 Test Meeting",
        description: "PIACT-002 Description",
        status: "scheduled",
        links: [
          { entityType: "account", entityId: "ctx.account.id" },
          { entityType: "contact", entityId: "ctx.contact.id" },
          { entityType: "opportunity", entityId: "ctx.opportunity.id" },
        ],
      },
      notes: "Persistencia exitosa de reunión",
    },
  }, async () => {
    expect(createdActivityId).toBeTruthy();
    const row = await prismadb.crm_Activities.findUnique({
      where: { id: createdActivityId ?? "" },
    });
    expect(row).not.toBeNull();
    expect(row?.title).toBe("PIACT-002 Test Meeting");
  });

  it("creates three links in crm_ActivityLinks pointing to account, contact, and opportunity", {
    meta: {
      id: "PIACT-004",
      endpoint: "Server Action: createActivity",
      objective:
        "Validar que se registren correctamente las relaciones de la actividad con la cuenta, contacto y oportunidad en la tabla de enlaces",
      expectedStatus: "Múltiples enlaces de actividad persistidos",
      notes: "Registro correcto de múltiples enlaces",
    },
  }, async () => {
    expect(createdActivityId).toBeTruthy();
    const links = await prismadb.crm_ActivityLinks.findMany({
      where: { activityId: createdActivityId ?? "" },
    });
    expect(links.length).toBe(3);

    const accountLink = links.find((l: any) => l.entityType === "account");
    expect(accountLink).toBeDefined();
    expect(accountLink?.entityId).toBe(ctx.account.id);

    const contactLink = links.find((l: any) => l.entityType === "contact");
    expect(contactLink).toBeDefined();
    expect(contactLink?.entityId).toBe(ctx.contact.id);

    const opportunityLink = links.find((l: any) => l.entityType === "opportunity");
    expect(opportunityLink).toBeDefined();
    expect(opportunityLink?.entityId).toBe(ctx.opportunity.id);
  });
});
