jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaign_templates: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getTemplate } from "@/actions/campaigns/templates/get-template";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("getTemplate scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns null and does not query", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getTemplate("t1");
    expect(res).toBeNull();
    expect(prismadb.crm_campaign_templates.findFirst).not.toHaveBeenCalled();
  });

  it("user out-of-scope: returns null (assert miss)", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getTemplate("t1");
    expect(res).toBeNull();
  });

  it("user in-scope owner: returns detail", async () => {
    mockUser("user", "u1");
    const detail = { id: "t1", name: "Welcome" };
    // First call = assert (scoped where), second call = detail
    (prismadb.crm_campaign_templates.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "t1" })
      .mockResolvedValueOnce(detail);
    const res = await getTemplate("t1");
    expect(res).toEqual(detail);
    const assertCall = (prismadb.crm_campaign_templates.findFirst as jest.Mock)
      .mock.calls[0][0];
    expect(assertCall.where.id).toBe("t1");
    expect(assertCall.where.created_by).toBe("u1");
    expect(assertCall.where.deletedAt).toBeNull();
  });

  it("manager: assert where has no created_by, returns detail", async () => {
    mockUser("manager", "m1");
    const detail = { id: "t1" };
    (prismadb.crm_campaign_templates.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "t1" })
      .mockResolvedValueOnce(detail);
    const res = await getTemplate("t1");
    expect(res).toEqual(detail);
    const assertCall = (prismadb.crm_campaign_templates.findFirst as jest.Mock)
      .mock.calls[0][0];
    expect(assertCall.where.created_by).toBeUndefined();
  });
});
