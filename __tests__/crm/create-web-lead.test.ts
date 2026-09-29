// Covers the public "create lead from web" intake: the fork-owned
// `createWebLead` helper (server-side relation resolution + background event)
// and the upstream-owned route's unchanged auth / `lastName` guards.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: { create: jest.fn() },
    crm_Lead_Sources: { findUnique: jest.fn() },
    crm_Lead_Statuses: { findUnique: jest.fn() },
    users: { findUnique: jest.fn() },
  },
}));

jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue({}) },
}));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { createWebLead } from "@/lib/crm/create-web-lead";
import { POST } from "@/app/api/crm/leads/create-lead-from-web/route";

const sources = prismadb.crm_Lead_Sources.findUnique as jest.Mock;
const statuses = prismadb.crm_Lead_Statuses.findUnique as jest.Mock;
const users = prismadb.users.findUnique as jest.Mock;
const createLead = prismadb.crm_Leads.create as jest.Mock;
const sendEvent = inngest.send as jest.Mock;

const OLD_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...OLD_ENV };
  // Default happy-path resolutions; individual tests override as needed.
  sources.mockResolvedValue({ id: "src-web" });
  statuses.mockResolvedValue({ id: "status-new" });
  users.mockResolvedValue({ id: "user-shaun" });
  createLead.mockImplementation(async ({ data }: any) => ({ id: "lead-1", ...data }));
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe("createWebLead — server-side relation resolution", () => {
  it("defaults the lead source to \"Web\" when none is posted", async () => {
    await createWebLead({ lastName: "Doe" });

    expect(sources).toHaveBeenCalledWith({ where: { name: "Web" } });
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lead_source_id: "src-web" }),
      })
    );
  });

  it("looks up the posted lead source by name", async () => {
    await createWebLead({ lastName: "Doe", lead_source: "Referral" });

    expect(sources).toHaveBeenCalledWith({ where: { name: "Referral" } });
  });

  it("resolves the \"New\" status", async () => {
    await createWebLead({ lastName: "Doe" });

    expect(statuses).toHaveBeenCalledWith({ where: { name: "New" } });
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lead_status_id: "status-new" }),
      })
    );
  });

  it("resolves the assignee from WEB_LEAD_ASSIGNEE_EMAIL", async () => {
    process.env.WEB_LEAD_ASSIGNEE_EMAIL = "someone@radeengineering.com";

    await createWebLead({ lastName: "Doe" });

    expect(users).toHaveBeenCalledWith({
      where: { email: "someone@radeengineering.com" },
    });
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assigned_to: "user-shaun" }),
      })
    );
  });

  it("defaults the assignee email to shaun@radeengineering.com", async () => {
    delete process.env.WEB_LEAD_ASSIGNEE_EMAIL;

    await createWebLead({ lastName: "Doe" });

    expect(users).toHaveBeenCalledWith({
      where: { email: "shaun@radeengineering.com" },
    });
  });

  it("falls back to null when a lookup finds nothing (never fails the create)", async () => {
    sources.mockResolvedValue(null);
    statuses.mockResolvedValue(null);
    users.mockResolvedValue(null);

    await createWebLead({ lastName: "Doe" });

    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lead_source_id: null,
          lead_status_id: null,
          assigned_to: null,
        }),
      })
    );
  });

  it("persists the posted contact fields and description with v: 1", async () => {
    await createWebLead({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      description: "Interested in a bridge inspection.",
    });

    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          v: 1,
          firstName: "Jane",
          lastName: "Doe",
          email: "jane@example.com",
          description: "Interested in a bridge inspection.",
        }),
      })
    );
  });

  it("fires the crm/lead.saved background event with the new lead id", async () => {
    await createWebLead({ lastName: "Doe" });

    expect(sendEvent).toHaveBeenCalledWith({
      name: "crm/lead.saved",
      data: { record_id: "lead-1" },
    });
  });

  it("does not send an \"assigned to you\" email (website already notifies)", async () => {
    // The helper has no email dependency; assert it created + emitted without one.
    await createWebLead({ lastName: "Doe" });
    expect(createLead).toHaveBeenCalledTimes(1);
    expect(sendEvent).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/crm/leads/create-lead-from-web — auth & validation guards", () => {
  const jsonRequest = (body: unknown, token?: string) =>
    new Request("http://localhost/api/crm/leads/create-lead-from-web", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: token } : {}),
      },
      body: JSON.stringify(body),
    });

  it("rejects a wrong bearer token with 401 and never touches the DB", async () => {
    process.env.NEXTCRM_TOKEN = "secret";

    const res = await POST(jsonRequest({ lastName: "Doe" }, "nope"));

    expect(res.status).toBe(401);
    expect(createLead).not.toHaveBeenCalled();
  });

  it("returns 400 when lastName is missing", async () => {
    process.env.NEXTCRM_TOKEN = "secret";

    const res = await POST(jsonRequest({ firstName: "Jane" }, "secret"));

    expect(res.status).toBe(400);
    expect(createLead).not.toHaveBeenCalled();
  });

  it("creates the lead and returns the success message on a valid POST", async () => {
    process.env.NEXTCRM_TOKEN = "secret";

    const res = await POST(
      jsonRequest({ lastName: "Doe", lead_source: "Web" }, "secret")
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      message: "New lead created successfully",
    });
    expect(createLead).toHaveBeenCalledTimes(1);
    expect(sendEvent).toHaveBeenCalledWith({
      name: "crm/lead.saved",
      data: { record_id: "lead-1" },
    });
  });
});
