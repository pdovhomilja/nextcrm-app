// Regression tests for GHSA-c9vg-c532-ppqx
// BOLA/IDOR in MCP campaign tools: handlers must enforce per-user/role scope
// so a normal user cannot list, read, or mutate campaigns owned by others.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaigns: {
      updateMany: jest.fn(),
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
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crm_campaign_sends: { findMany: jest.fn(), updateMany: jest.fn() },
    campaignToTargetLists: { create: jest.fn(), delete: jest.fn() },
  },
}));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));

import { prismadb } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { campaignTools } from "@/lib/mcp/tools/campaigns";
import { CAMPAIGN_NOT_DELETED } from "@/lib/authz/scopes/campaign-not-deleted";

type Role = "user" | "manager" | "admin";
const USER = { id: "u1", role: "user" as Role };
const MANAGER = { id: "m1", role: "manager" as Role };
const ADMIN = { id: "a1", role: "admin" as Role };

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
  it("normal user: scope where includes created_by + not deleted", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1" });
    await run("campaigns_get", { id: "c1" }, USER);
    const where = (prismadb.crm_campaigns.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.created_by).toBe("u1");
    expect(where.AND).toEqual([CAMPAIGN_NOT_DELETED]);
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
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("missing campaign throws NOT_FOUND and sends no campaigns/deleted event", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_delete", { id: "missing" }, MANAGER)).rejects.toThrow("NOT_FOUND");
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("a sending campaign is refused with CONFLICT and its jobs are not cancelled", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status: "sending" });
    await expect(run("campaigns_delete", { id: "c1" }, USER)).rejects.toThrow("CONFLICT");
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("in-scope delete cancels the campaign's sleeping jobs (campaigns/deleted)", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status: "scheduled" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await run("campaigns_delete", { id: "c1" }, USER);
    expect(inngest.send).toHaveBeenCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledWith({ name: "campaigns/deleted", data: { campaignId: "c1" } });
  });

  it("failed soft delete sends no campaigns/deleted event", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status: "scheduled" });
    (prismadb.crm_campaigns.update as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(run("campaigns_delete", { id: "c1" }, USER)).rejects.toThrow("db down");
    expect(inngest.send).not.toHaveBeenCalled();
  });
});

describe("campaigns_pause cancels sleeping jobs", () => {
  it("sends campaigns/paused after the status update", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status: "sending" });
    (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
    await run("campaigns_pause", { id: "c1" }, USER);
    expect(inngest.send).toHaveBeenCalledTimes(1);
    expect(inngest.send).toHaveBeenCalledWith({ name: "campaigns/paused", data: { campaignId: "c1" } });
  });

  it("a refused pause (not sending) sends no event", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status: "draft" });
    await expect(run("campaigns_pause", { id: "c1" }, USER)).rejects.toThrow("CONFLICT");
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("a failed status update sends no event", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status: "sending" });
    (prismadb.crm_campaigns.update as jest.Mock).mockRejectedValue(new Error("db down"));
    await expect(run("campaigns_pause", { id: "c1" }, USER)).rejects.toThrow("db down");
    expect(inngest.send).not.toHaveBeenCalled();
  });
});

describe("campaigns_send / pause / resume scope", () => {
  it("pause: out-of-scope throws NOT_FOUND, no status change", async () => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run("campaigns_pause", { id: "victim" }, USER)).rejects.toThrow("NOT_FOUND");
    expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
  });
});

// campaigns_send moves the campaign with a conditional updateMany, campaigns_resume with update.
const statusWrite = (name: string) =>
  (name === "campaigns_send" ? prismadb.crm_campaigns.updateMany : prismadb.crm_campaigns.update) as jest.Mock;
const mockStatusWrite = () => {
  (prismadb.crm_campaigns.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  (prismadb.crm_campaigns.update as jest.Mock).mockResolvedValue({ id: "c1" });
};
const expectNoStatusWrite = () => {
  expect(prismadb.crm_campaigns.update).not.toHaveBeenCalled();
  expect(prismadb.crm_campaigns.updateMany).not.toHaveBeenCalled();
};

describe.each([
  ["campaigns_send", "draft"],
  ["campaigns_resume", "paused"],
])(
  "%s needs manager or admin, like sending from the web app",
  (name, status) => {
    beforeEach(() => {
      (prismadb.crm_campaign_steps.findFirst as jest.Mock).mockResolvedValue({ id: "s0" });
    });

    it("plain user on their own campaign is refused: no update, no event", async () => {
      (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status, created_by: USER.id });
      await expect(run(name, { id: "c1" }, USER)).rejects.toThrow("FORBIDDEN");
      expectNoStatusWrite();
      expect(inngest.send).not.toHaveBeenCalled();
    });

    it("plain user gets the same answer for a campaign that does not exist", async () => {
      (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(run(name, { id: "missing" }, USER)).rejects.toThrow("FORBIDDEN");
      expectNoStatusWrite();
    });

    it("manager without a matching campaign still gets NOT_FOUND", async () => {
      (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(run(name, { id: "missing" }, MANAGER)).rejects.toThrow("NOT_FOUND");
      expectNoStatusWrite();
      expect(inngest.send).not.toHaveBeenCalled();
    });

    it.each([
      ["manager", MANAGER],
      ["admin", ADMIN],
    ])("%s can still do it", async (_label, user) => {
      (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status });
      mockStatusWrite();
      await run(name, { id: "c1" }, user);
      expect(statusWrite(name).mock.calls[0][0].data.status).toBe("sending");
      expect(inngest.send).toHaveBeenCalledWith({ name: "campaigns/send-now", data: { campaignId: "c1" } });
    });
  }
);

describe("campaigns_send / resume require step 0", () => {
  const ID = "c1";
  const NO_STEP_0 = "Campaign has no first step (step 0)";

  beforeEach(() => {
    // c1 has a step 0 unless a test says otherwise; other orders never match.
    (prismadb.crm_campaign_steps.findFirst as jest.Mock).mockImplementation(async ({ where }) =>
      where.campaign_id === ID && where.order === 0 ? { id: "s0" } : null
    );
  });

  const expectRefused = async (name: string, status: string) => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c2", status });
    await expect(run(name, { id: "c2" }, MANAGER)).rejects.toThrow(`CONFLICT: ${NO_STEP_0}`);
    expectNoStatusWrite();
    expect(inngest.send).not.toHaveBeenCalled();
  };

  const expectSent = async (name: string, status: string) => {
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: ID, status });
    mockStatusWrite();
    await run(name, { id: ID }, MANAGER);
    expect(statusWrite(name).mock.calls[0][0].data.status).toBe("sending");
    expect(inngest.send).toHaveBeenCalledWith({
      name: "campaigns/send-now",
      data: { campaignId: ID },
    });
  };

  it("send: no step 0 is refused, no status change, no event", () =>
    expectRefused("campaigns_send", "draft"));
  it("send: with step 0 sends as before", () => expectSent("campaigns_send", "draft"));
  it("resume: no step 0 is refused, no status change, no event", () =>
    expectRefused("campaigns_resume", "paused"));
  it("resume: with step 0 sends as before", () => expectSent("campaigns_resume", "paused"));
});

describe("campaigns_send status write", () => {
  it("only moves a draft or scheduled campaign", async () => {
    (prismadb.crm_campaign_steps.findFirst as jest.Mock).mockResolvedValue({ id: "s0" });
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status: "draft" });
    mockStatusWrite();
    await run("campaigns_send", { id: "c1" }, MANAGER);
    expect(statusWrite("campaigns_send").mock.calls[0][0].where).toEqual({
      id: "c1",
      status: { in: ["draft", "scheduled"] },
    });
  });

  it("a call that loses the status write gets the conflict, no event", async () => {
    (prismadb.crm_campaign_steps.findFirst as jest.Mock).mockResolvedValue({ id: "s0" });
    (prismadb.crm_campaigns.findFirst as jest.Mock).mockResolvedValue({ id: "c1", status: "draft" });
    (prismadb.crm_campaigns.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    await expect(run("campaigns_send", { id: "c1" }, MANAGER)).rejects.toThrow(
      "CONFLICT: Cannot send campaign in status: sending"
    );
    expect(inngest.send).not.toHaveBeenCalled();
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
