import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_campaigns: { findFirst: jest.fn() },
    crm_campaign_templates: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  campaignReadScopeWhere,
  campaignTemplateReadScopeWhere,
  assertCanReadCampaign,
  assertCanWriteCampaign,
  assertCanReadTemplate,
  assertCanWriteTemplate,
} from "../scopes/crm";

const findCampaign = prismadb.crm_campaigns.findFirst as jest.MockedFunction<
  typeof prismadb.crm_campaigns.findFirst
>;
const findTemplate = prismadb.crm_campaign_templates
  .findFirst as jest.MockedFunction<
  typeof prismadb.crm_campaign_templates.findFirst
>;

beforeEach(() => jest.clearAllMocks());

describe("campaignReadScopeWhere", () => {
  it("admin/manager → { status: { not: 'deleted' } }", () => {
    expect(campaignReadScopeWhere({ id: "x", role: "admin" })).toEqual({
      status: { not: "deleted" },
    });
    expect(campaignReadScopeWhere({ id: "x", role: "manager" })).toEqual({
      status: { not: "deleted" },
    });
  });
  it("user → { status: { not: 'deleted' }, created_by: user.id }", () => {
    expect(campaignReadScopeWhere({ id: "u1", role: "user" })).toEqual({
      status: { not: "deleted" },
      created_by: "u1",
    });
  });
});

describe("campaignTemplateReadScopeWhere", () => {
  it("admin/manager → { deletedAt: null }", () => {
    expect(
      campaignTemplateReadScopeWhere({ id: "x", role: "admin" }),
    ).toEqual({ deletedAt: null });
    expect(
      campaignTemplateReadScopeWhere({ id: "x", role: "manager" }),
    ).toEqual({ deletedAt: null });
  });
  it("user → { deletedAt: null, created_by: user.id }", () => {
    expect(campaignTemplateReadScopeWhere({ id: "u1", role: "user" })).toEqual({
      deletedAt: null,
      created_by: "u1",
    });
  });
});

describe("assertCanReadCampaign", () => {
  it("admin: where { id, status:{not:'deleted'} } (200)", async () => {
    findCampaign.mockResolvedValue({ id: "c1" } as any);
    await assertCanReadCampaign({ id: "x", role: "admin" }, "c1");
    expect(findCampaign).toHaveBeenCalledWith({
      where: { id: "c1", status: { not: "deleted" } },
      select: { id: true },
    });
  });
  it("user: where merges created_by scope (200 hit)", async () => {
    findCampaign.mockResolvedValue({ id: "c1" } as any);
    await assertCanReadCampaign({ id: "u1", role: "user" }, "c1");
    expect(findCampaign).toHaveBeenCalledWith({
      where: { id: "c1", status: { not: "deleted" }, created_by: "u1" },
      select: { id: true },
    });
  });
  it("throws AuthorizationError on miss (404)", async () => {
    findCampaign.mockResolvedValue(null);
    await expect(
      assertCanReadCampaign({ id: "u1", role: "user" }, "c1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteCampaign", () => {
  it("delegates to read scope (200)", async () => {
    findCampaign.mockResolvedValue({ id: "c1" } as any);
    await assertCanWriteCampaign({ id: "u1", role: "user" }, "c1");
    expect(findCampaign).toHaveBeenCalledWith({
      where: { id: "c1", status: { not: "deleted" }, created_by: "u1" },
      select: { id: true },
    });
  });
  it("throws on miss (404)", async () => {
    findCampaign.mockResolvedValue(null);
    await expect(
      assertCanWriteCampaign({ id: "u1", role: "user" }, "c1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanReadTemplate", () => {
  it("admin: where { id, deletedAt:null } (200)", async () => {
    findTemplate.mockResolvedValue({ id: "t1" } as any);
    await assertCanReadTemplate({ id: "x", role: "admin" }, "t1");
    expect(findTemplate).toHaveBeenCalledWith({
      where: { id: "t1", deletedAt: null },
      select: { id: true },
    });
  });
  it("user: where merges created_by scope (200 hit)", async () => {
    findTemplate.mockResolvedValue({ id: "t1" } as any);
    await assertCanReadTemplate({ id: "u1", role: "user" }, "t1");
    expect(findTemplate).toHaveBeenCalledWith({
      where: { id: "t1", deletedAt: null, created_by: "u1" },
      select: { id: true },
    });
  });
  it("throws AuthorizationError on miss (404)", async () => {
    findTemplate.mockResolvedValue(null);
    await expect(
      assertCanReadTemplate({ id: "u1", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteTemplate", () => {
  it("delegates to read scope (200)", async () => {
    findTemplate.mockResolvedValue({ id: "t1" } as any);
    await assertCanWriteTemplate({ id: "u1", role: "user" }, "t1");
    expect(findTemplate).toHaveBeenCalledWith({
      where: { id: "t1", deletedAt: null, created_by: "u1" },
      select: { id: true },
    });
  });
  it("throws on miss (404)", async () => {
    findTemplate.mockResolvedValue(null);
    await expect(
      assertCanWriteTemplate({ id: "u1", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
