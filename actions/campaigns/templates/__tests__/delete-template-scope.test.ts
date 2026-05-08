jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaign_templates: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { deleteTemplate } from "@/actions/campaigns/templates/delete-template";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("deleteTemplate scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized, no update", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await deleteTemplate("t1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_campaign_templates.update).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns Not found, no update", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await deleteTemplate("t1");
    expect(res).toEqual({ error: "Not found" });
    expect(prismadb.crm_campaign_templates.update).not.toHaveBeenCalled();
  });

  it("user in-scope owner: soft-deletes with deletedBy = user.id", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.crm_campaign_templates.update as jest.Mock).mockResolvedValue({ id: "t1" });
    await deleteTemplate("t1");
    const call = (prismadb.crm_campaign_templates.update as jest.Mock).mock.calls[0][0];
    expect(call.data.deletedBy).toBe("u1");
    expect(call.data.deletedAt).toBeInstanceOf(Date);
  });

  it("manager: soft-deletes", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.crm_campaign_templates.update as jest.Mock).mockResolvedValue({ id: "t1" });
    await deleteTemplate("t1");
    const call = (prismadb.crm_campaign_templates.update as jest.Mock).mock.calls[0][0];
    expect(call.data.deletedBy).toBe("m1");
  });
});
