/**
 * Campaigns have two delete markers: the campaigns UI sets status "deleted",
 * the MCP campaigns_delete tool sets deletedAt. campaignReadScopeWhere must hide
 * both, and keep campaigns whose status is NULL. DB-backed: CI runs it in the
 * integration job.
 *
 * Fixture: creator U (role user) owns four campaigns: normal ("sent"), NULL
 * status, UI-deleted (status "deleted") and MCP-deleted (status "sent",
 * deletedAt set). Manager M and partner P own nothing.
 */
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));

import { randomUUID } from "crypto";
import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getCampaigns } from "@/actions/campaigns/get-campaigns";
import { getCampaign } from "@/actions/campaigns/get-campaign";
import { getCampaignsCount } from "@/actions/dashboard/get-campaigns-count";

const tag = randomUUID().slice(0, 8);
const U = { creator: randomUUID(), manager: randomUUID(), partner: randomUUID() };
const C = { normal: randomUUID(), nullStatus: randomUUID(), uiDeleted: randomUUID(), mcpDeleted: randomUUID() };
const as = (who: keyof typeof U) => (getSession as jest.Mock).mockResolvedValue({ user: { id: U[who] } });
const names = (rows: { name: string }[]) => rows.map((r) => r.name).sort();
const VISIBLE = [`normal-${tag}`, `null-${tag}`];

beforeAll(async () => {
  await prismadb.users.createMany({
    data: [
      { id: U.creator, email: `c-${tag}@cdm.test`, name: `c-${tag}`, role: "user", userStatus: "ACTIVE" },
      { id: U.manager, email: `m-${tag}@cdm.test`, name: `m-${tag}`, role: "manager", userStatus: "ACTIVE" },
      { id: U.partner, email: `p-${tag}@cdm.test`, name: `p-${tag}`, role: "partner", userStatus: "ACTIVE" },
    ],
  });
  await prismadb.crm_campaigns.createMany({
    data: [
      { id: C.normal, name: `normal-${tag}`, status: "sent" },
      { id: C.nullStatus, name: `null-${tag}`, status: null },
      { id: C.uiDeleted, name: `ui-deleted-${tag}`, status: "deleted" },
      { id: C.mcpDeleted, name: `mcp-deleted-${tag}`, status: "sent", deletedAt: new Date() },
    ].map((c) => ({ ...c, v: 0, created_by: U.creator })),
  });
});

afterAll(async () => {
  await prismadb.crm_campaigns.deleteMany({ where: { id: { in: Object.values(C) } } });
  await prismadb.users.deleteMany({ where: { id: { in: Object.values(U) } } });
  await prismadb.$disconnect();
});

describe("campaigns list (getCampaigns)", () => {
  it.each(["creator", "manager"] as const)("%s sees the normal and the NULL-status campaign only", async (who) => {
    as(who);
    expect(names(await getCampaigns({ search: tag }))).toEqual(VISIBLE);
  });

  it("the UI status filter still works and cannot bring a deleted campaign back", async () => {
    as("manager");
    expect(names(await getCampaigns({ search: tag, status: "sent" }))).toEqual([`normal-${tag}`]);
    expect(await getCampaigns({ search: tag, status: "deleted" })).toEqual([]);
  });
});

describe("dashboard campaign count (getCampaignsCount)", () => {
  // The manager's count is global, so check which fixture rows its where
  // matches (a bare count would hide one bug behind the other: 2 either way).
  it.each([
    ["manager", VISIBLE],
    ["creator", VISIBLE],
    ["partner", []],
  ] as const)("%s's count matches only the normal and the NULL-status campaign", async (who, expected) => {
    as(who);
    const spy = jest.spyOn(prismadb.crm_campaigns, "count");
    await getCampaignsCount();
    const where = (spy.mock.calls[0][0] as { where: object }).where;
    spy.mockRestore();
    const rows = await prismadb.crm_campaigns.findMany({ where: { AND: [where, { name: { contains: tag } }] } });
    expect(names(rows)).toEqual(expected);
  });
});

describe("campaign detail (getCampaign)", () => {
  it.each(["creator", "manager"] as const)("%s can open only the normal and the NULL-status campaign", async (who) => {
    as(who);
    expect((await getCampaign(C.normal))?.id).toBe(C.normal);
    expect((await getCampaign(C.nullStatus))?.id).toBe(C.nullStatus);
    expect(await getCampaign(C.uiDeleted)).toBeNull();
    expect(await getCampaign(C.mcpDeleted)).toBeNull();
  });
});
