jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_campaign_templates: { create: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { createTemplate } from "@/actions/campaigns/templates/create-template";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

const baseInput = {
  name: "T1",
  content_html: "<p>x</p>",
  content_json: {},
};

describe("createTemplate scope", () => {
  beforeEach(() => jest.clearAllMocks());

  it("unauthenticated returns Unauthorized error and never writes", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await createTemplate({ ...baseInput });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_campaign_templates.create).not.toHaveBeenCalled();
  });

  it("user creates template with created_by = user.id", async () => {
    mockUser("user", "u1");
    (prismadb.crm_campaign_templates.create as jest.Mock).mockResolvedValue({ id: "t1" });
    await createTemplate({ ...baseInput });
    const call = (prismadb.crm_campaign_templates.create as jest.Mock).mock.calls[0][0];
    expect(call.data.created_by).toBe("u1");
    expect(call.data.created_by).not.toBeNull();
  });

  it("manager creates template successfully with created_by set", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_campaign_templates.create as jest.Mock).mockResolvedValue({ id: "t2" });
    await createTemplate({ ...baseInput });
    const call = (prismadb.crm_campaign_templates.create as jest.Mock).mock.calls[0][0];
    expect(call.data.created_by).toBe("m1");
    expect(call.data.created_by).not.toBeNull();
  });

  it("created_by is never null when authenticated", async () => {
    mockUser("admin", "a1");
    (prismadb.crm_campaign_templates.create as jest.Mock).mockResolvedValue({ id: "t3" });
    await createTemplate({ ...baseInput });
    const call = (prismadb.crm_campaign_templates.create as jest.Mock).mock.calls[0][0];
    expect(call.data.created_by).toBe("a1");
    expect(call.data.created_by).not.toBeNull();
  });
});
