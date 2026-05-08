jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: { findMany: jest.fn() },
    crm_Leads: { findMany: jest.fn() },
    crm_Opportunities: { findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  filterAuthorizedAccountIds,
  filterAuthorizedLeadIds,
  filterAuthorizedOpportunityIds,
} from "../scopes/crm";

const accountsFindMany = prismadb.crm_Accounts.findMany as jest.Mock;
const leadsFindMany = prismadb.crm_Leads.findMany as jest.Mock;
const oppFindMany = prismadb.crm_Opportunities.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("filterAuthorizedAccountIds", () => {
  it("empty input → empty, no DB call", async () => {
    const out = await filterAuthorizedAccountIds(
      { id: "u", role: "user" },
      [],
    );
    expect(out).toEqual([]);
    expect(accountsFindMany).not.toHaveBeenCalled();
  });

  it("admin: { id: { in }, deletedAt: null }", async () => {
    accountsFindMany.mockResolvedValue([{ id: "a1" }, { id: "a2" }]);
    const out = await filterAuthorizedAccountIds(
      { id: "u", role: "admin" },
      ["a1", "a2", "a3"],
    );
    expect(out).toEqual(["a1", "a2"]);
    expect(accountsFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["a1", "a2", "a3"] }, deletedAt: null },
      select: { id: true },
    });
  });

  it("user: composes accountReadScopeWhere (deletedAt + ownership OR)", async () => {
    accountsFindMany.mockResolvedValue([{ id: "a1" }]);
    await filterAuthorizedAccountIds(
      { id: "u3", role: "user" },
      ["a1", "a2"],
    );
    const arg = accountsFindMany.mock.calls[0][0];
    expect(arg.where).toMatchObject({
      id: { in: ["a1", "a2"] },
      deletedAt: null,
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { createdBy: "u3" },
        { watchers: { some: { user_id: "u3" } } },
      ]),
    });
  });
});

describe("filterAuthorizedLeadIds", () => {
  it("empty input → empty, no DB call", async () => {
    const out = await filterAuthorizedLeadIds(
      { id: "u", role: "user" },
      [],
    );
    expect(out).toEqual([]);
    expect(leadsFindMany).not.toHaveBeenCalled();
  });

  it("admin: { id: { in }, deletedAt: null }", async () => {
    leadsFindMany.mockResolvedValue([{ id: "l1" }]);
    const out = await filterAuthorizedLeadIds(
      { id: "u", role: "admin" },
      ["l1", "l2"],
    );
    expect(out).toEqual(["l1"]);
    expect(leadsFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["l1", "l2"] }, deletedAt: null },
      select: { id: true },
    });
  });

  it("user: composes leadReadScopeWhere with linked-account branch", async () => {
    leadsFindMany.mockResolvedValue([{ id: "l1" }]);
    await filterAuthorizedLeadIds(
      { id: "u3", role: "user" },
      ["l1", "l2"],
    );
    const arg = leadsFindMany.mock.calls[0][0];
    expect(arg.where).toMatchObject({
      id: { in: ["l1", "l2"] },
      deletedAt: null,
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { createdBy: "u3" },
        {
          assigned_accounts: {
            OR: expect.arrayContaining([
              { assigned_to: "u3" },
              { createdBy: "u3" },
              { watchers: { some: { user_id: "u3" } } },
            ]),
          },
        },
      ]),
    });
  });
});

describe("filterAuthorizedOpportunityIds", () => {
  it("empty input → empty, no DB call", async () => {
    const out = await filterAuthorizedOpportunityIds(
      { id: "u", role: "user" },
      [],
    );
    expect(out).toEqual([]);
    expect(oppFindMany).not.toHaveBeenCalled();
  });

  it("manager: { id: { in }, deletedAt: null }", async () => {
    oppFindMany.mockResolvedValue([{ id: "o1" }]);
    const out = await filterAuthorizedOpportunityIds(
      { id: "u", role: "manager" },
      ["o1", "o2"],
    );
    expect(out).toEqual(["o1"]);
    expect(oppFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["o1", "o2"] }, deletedAt: null },
      select: { id: true },
    });
  });

  it("user: composes opportunityReadScopeWhere with linked-account branch", async () => {
    oppFindMany.mockResolvedValue([{ id: "o1" }]);
    await filterAuthorizedOpportunityIds(
      { id: "u3", role: "user" },
      ["o1", "o2"],
    );
    const arg = oppFindMany.mock.calls[0][0];
    expect(arg.where).toMatchObject({
      id: { in: ["o1", "o2"] },
      deletedAt: null,
      OR: expect.arrayContaining([
        { assigned_to: "u3" },
        { createdBy: "u3" },
        {
          assigned_account: {
            OR: expect.arrayContaining([
              { assigned_to: "u3" },
              { createdBy: "u3" },
              { watchers: { some: { user_id: "u3" } } },
            ]),
          },
        },
      ]),
    });
  });
});
