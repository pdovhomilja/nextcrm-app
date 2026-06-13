// Regression tests for GHSA-c9vg-c532-ppqx
// BOLA/IDOR in MCP campaign tools: handlers must enforce per-user/role scope
// so a normal user cannot list, read, or mutate campaigns owned by others.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaigns: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    crm_campaign_templates: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    crm_campaign_steps: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crm_campaign_sends: { findMany: jest.fn() },
    campaignToTargetLists: { create: jest.fn(), delete: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));

import { prismadb } from "@/lib/prisma";
import { campaignTools } from "@/lib/mcp/tools/campaigns";

type Role = "user" | "manager" | "admin";
const USER = { id: "u1", role: "user" as Role };
const MANAGER = { id: "m1", role: "manager" as Role };

const tool = (name: string) => {
  const t = campaignTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
};
// Handlers receive (args, userId, user)
const run = (name: string, args: any, user: { id: string; role: Role }) =>
  (tool(name).handler as any)(args, user.id, user);

beforeEach(() => jest.clearAllMocks());

describe("campaigns_list scope", () => {
  it("normal user is scoped to created_by = own id", async () => {
    (prismadb.crm_campaigns.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_campaigns.count as jest.Mock).mockResolvedValue(0);
    await run("campaigns_list", { limit: 20, offset: 0 }, USER);
    const where = (prismadb.crm_campaigns.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.created_by).toBe("u1");
  });

  it("manager is NOT scoped by created_by", async () => {
    (prismadb.crm_campaigns.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_campaigns.count as jest.Mock).mockResolvedValue(0);
    await run("campaigns_list", { limit: 20, offset: 0 }, MANAGER);
    const where = (prismadb.crm_campaigns.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.created_by).toBeUndefined();
  });
});

describe("campaigns_get scope", () => {
  it("normal user: scope where includes created_by + status not deleted", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    await run("campaigns_get", { id: "c1" }, USER);
    const where = (prismadb.crm_campaigns.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.created_by).toBe("u1");
    expect(where.status).toEqual({ not: "deleted" });
  });

  it("out-of-scope campaign returns NOT_FOUND", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_get", { id: "victim" }, USER)).rejects.toThrow("NOT_FOUND");
  });
});

describe("campaigns_update scope", () => {
  it("out-of-scope campaign throws NOT_FOUND and never updates", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      run("campaigns_update", { id: "victim", name: "hacked" }, USER)
    ).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
  });

  it("scopes the ownership lookup by created_by for normal users", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status: "draft" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await run("campaigns_update", { id: "c1", name: "ok" }, USER);
    const where = (prismadb.crm_campaigns.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.created_by).toBe("u1");
  });
});

describe("campaigns_delete scope", () => {
  it("out-of-scope campaign throws NOT_FOUND and never soft-deletes", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_delete", { id: "victim" }, USER)).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
  });
});

describe("campaigns_send / pause / resume scope", () => {
  it("send: out-of-scope throws NOT_FOUND, no status change", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_send", { id: "victim" }, USER)).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
  });

  it("pause: out-of-scope throws NOT_FOUND, no status change", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_pause", { id: "victim" }, USER)).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
  });

  it("resume: out-of-scope throws NOT_FOUND, no status change", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_resume", { id: "victim" }, USER)).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
  });
});

describe("campaigns_get_stats scope", () => {
  it("out-of-scope throws NOT_FOUND and never reads sends", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_get_stats", { id: "victim" }, USER)).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaign_sends.findMany).not.toHaveBeenCalled();
  });
});

describe("campaign step scope (parent campaign ownership)", () => {
  it("create_step: parent campaign out-of-scope throws NOT_FOUND", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      run(
        "campaigns_create_step",
        { campaign_id: "victim", order: 1, template_id: "t1", subject: "x", delay_days: 0, send_to: "all" },
        USER
      )
    ).rejects.toThrow("NOT_FOUND");
  });

  it("update_step: parent campaign out-of-scope throws NOT_FOUND and never updates", async () => {
    (prismadb.crm_campaign_steps.findUnique as jest.Mock).mockResolvedValue({ id: "s1", campaign_id: "victim" });
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_update_step", { id: "s1", subject: "x" }, USER)).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaign_steps.update).not.toHaveBeenCalled();
  });

  it("delete_step: parent campaign out-of-scope throws NOT_FOUND and never deletes", async () => {
    (prismadb.crm_campaign_steps.findUnique as jest.Mock).mockResolvedValue({ id: "s1", campaign_id: "victim" });
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_delete_step", { id: "s1" }, USER)).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaign_steps.delete).not.toHaveBeenCalled();
  });
});

describe("campaign target-list assignment scope", () => {
  it("assign: parent campaign out-of-scope throws NOT_FOUND and never links", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      run("campaigns_assign_target_list", { campaign_id: "victim", target_list_id: "tl1" }, USER)
    ).rejects.toThrow("NOT_FOUND");
    expect(prismadb.campaignToTargetLists.create).not.toHaveBeenCalled();
  });

  it("remove: parent campaign out-of-scope throws NOT_FOUND and never unlinks", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      run("campaigns_remove_target_list", { campaign_id: "victim", target_list_id: "tl1" }, USER)
    ).rejects.toThrow("NOT_FOUND");
    expect(prismadb.campaignToTargetLists.delete).not.toHaveBeenCalled();
  });
});

describe("campaign template scope", () => {
  it("list_templates: normal user scoped by created_by", async () => {
    (prismadb.crm_campaign_templates.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_campaign_templates.count as jest.Mock).mockResolvedValue(0);
    await run("campaigns_list_templates", { limit: 20, offset: 0 }, USER);
    const where = (prismadb.crm_campaign_templates.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.created_by).toBe("u1");
  });

  it("get_template: out-of-scope throws NOT_FOUND", async () => {
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_get_template", { id: "victim" }, USER)).rejects.toThrow("NOT_FOUND");
  });

  it("update_template: out-of-scope throws NOT_FOUND and never updates", async () => {
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      run("campaigns_update_template", { id: "victim", name: "x" }, USER)
    ).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaign_templates.update).not.toHaveBeenCalled();
  });

  it("delete_template: out-of-scope throws NOT_FOUND and never updates", async () => {
    (prismadb.crm_campaign_templates.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_delete_template", { id: "victim" }, USER)).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaign_templates.update).not.toHaveBeenCalled();
  });
});
