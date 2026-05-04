jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaign_templates: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getTemplates } from "@/actions/campaigns/templates/get-templates";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getTemplates scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns [] and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getTemplates();
    expect(res).toEqual([]);
    expect(prismadb.crm_campaign_templates.findMany).not.toHaveBeenCalled();
  });

  it("user role: where scoped by created_by and deletedAt null", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaign_templates.findMany as jest.Mock).mockResolvedValue([]);
    await getTemplates();
    const call = (prismadb.crm_campaign_templates.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.created_by).toBe("u1");
    expect(call.where.deletedAt).toBeNull();
  });

  it("manager: where has no created_by", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaign_templates.findMany as jest.Mock).mockResolvedValue([]);
    await getTemplates();
    const call = (prismadb.crm_campaign_templates.findMany as jest.Mock).mock.calls[0][0];
    expect(call.where.created_by).toBeUndefined();
    expect(call.where.deletedAt).toBeNull();
  });

  it("returns rows from findMany", async () => {
    mockUser("user", "u1");
    const rows = [{ id: "t1" }];
    (prismadb.crm_campaign_templates.findMany as jest.Mock).mockResolvedValue(rows);
    const res = await getTemplates();
    expect(res).toEqual(rows);
  });
});
