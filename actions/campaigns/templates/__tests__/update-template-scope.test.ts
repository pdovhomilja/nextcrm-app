jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaign_templates: { findFirst: jest.fn(), update: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { updateTemplate } from "@/actions/campaigns/templates/update-template";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("updateTemplate scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized, no update", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await updateTemplate("t1", { name: "x" });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_campaign_templates.update).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns Not found, no update", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await updateTemplate("t1", { name: "x" });
    expect(res).toEqual({ error: "Not found" });
    expect(prismadb.crm_campaign_templates.update).not.toHaveBeenCalled();
  });

  it("user in-scope owner: updates", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.crm_campaign_templates.update as jest.Mock).mockResolvedValue({ id: "t1" });
    await updateTemplate("t1", { name: "x" });
    expect(prismadb.crm_campaign_templates.update).toHaveBeenCalledTimes(1);
  });

  it("manager: updates", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue({ id: "t1" });
    (prismadb.crm_campaign_templates.update as jest.Mock).mockResolvedValue({ id: "t1" });
    await updateTemplate("t1", { name: "x" });
    expect(prismadb.crm_campaign_templates.update).toHaveBeenCalledTimes(1);
  });
});
