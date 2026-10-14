jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: { findFirst: jest.fn(), create: jest.fn() },
    crm_Lead_Statuses: { findFirst: jest.fn() },
    crm_Contacts: { findFirst: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/plugins/notify", () => ({
  sendPluginNotification: jest.fn().mockResolvedValue(undefined),
}));

import { prismadb } from "@/lib/prisma";
import { intakeWebsiteLead } from "@/lib/crm/leads/intake-website-lead";

const findLead = prismadb.crm_Leads.findFirst as jest.Mock;
const createLead = prismadb.crm_Leads.create as jest.Mock;
const findStatus = prismadb.crm_Lead_Statuses.findFirst as jest.Mock;

const UUID = "550e8400-e29b-41d4-a716-446655440000";

const input = {
  externalId: UUID,
  source: "vensailabs.in/contact",
  submittedAt: "2026-10-12T16:00:00.000Z",
  name: "Jane Doe",
  company: "Acme Ltd",
  email: "jane@example.com",
  phone: "+91 98765 43210",
  country: "India",
  serviceRequired: "Software Development",
  projectType: "New Project / Build from Scratch",
  description: "Need help.",
};

beforeEach(() => {
  jest.clearAllMocks();
  findStatus.mockResolvedValue({ id: "status-new" });
});

describe("intakeWebsiteLead", () => {
  it("returns existing lead id without creating when externalId matches", async () => {
    findLead.mockResolvedValue({ id: "existing-lead" });
    const result = await intakeWebsiteLead(input);
    expect(result).toEqual({ ok: true, leadId: "existing-lead", created: false });
    expect(createLead).not.toHaveBeenCalled();
  });

  it("creates a lead when externalId is new", async () => {
    findLead.mockResolvedValue(null);
    createLead.mockResolvedValue({ id: "new-lead", firstName: "Jane", lastName: "Doe", company: "Acme Ltd" });
    const result = await intakeWebsiteLead(input);
    expect(result).toEqual({ ok: true, leadId: "new-lead", created: true });
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          externalId: UUID,
          lead_status_id: "status-new",
          assigned_to: undefined,
        }),
      })
    );
  });
});
