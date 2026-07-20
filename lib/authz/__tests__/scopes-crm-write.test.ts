import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: { findFirst: jest.fn() },
    crm_Opportunities: { findFirst: jest.fn() },
    crm_Contracts: { findFirst: jest.fn() },
    crm_TargetLists: { findFirst: jest.fn() },
    crm_Accounts_Tasks: { findFirst: jest.fn() },
    crm_OpportunityLineItems: { findUnique: jest.fn() },
    crm_ContractLineItems: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  assertCanWriteLead,
  assertCanWriteOpportunity,
  assertCanWriteContract,
  assertCanWriteTargetList,
  assertCanWriteCrmTask,
  assertCanWriteOpportunityLineItem,
  assertCanWriteContractLineItem,
} from "../scopes/crm";

beforeEach(() => jest.clearAllMocks());

describe("assertCanWriteLead / Opportunity / Contract (assigned_to+createdBy, deletedAt)", () => {
  const cases = [
    ["Leads", assertCanWriteLead, prismadb.crm_Leads.findFirst as jest.Mock],
    ["Opportunities", assertCanWriteOpportunity, prismadb.crm_Opportunities.findFirst as jest.Mock],
    ["Contracts", assertCanWriteContract, prismadb.crm_Contracts.findFirst as jest.Mock],
  ] as const;

  for (const [label, assertFn, find] of cases) {
    it(`${label}: admin gets a bare id+deletedAt where`, async () => {
      find.mockResolvedValue({ id: "r1" });
      await assertFn({ id: "u", role: "admin" }, "r1");
      expect(find).toHaveBeenCalledWith({
        where: { id: "r1", deletedAt: null },
        select: { id: true },
      });
    });

    it(`${label}: user is scoped to assigned_to/createdBy`, async () => {
      find.mockResolvedValue({ id: "r1" });
      await assertFn({ id: "u3", role: "user" }, "r1");
      const arg = find.mock.calls[0][0]!;
      expect(arg.where).toMatchObject({
        id: "r1",
        deletedAt: null,
        OR: [{ assigned_to: "u3" }, { createdBy: "u3" }],
      });
    });

    it(`${label}: throws when not in scope`, async () => {
      find.mockResolvedValue(null);
      await expect(assertFn({ id: "u3", role: "user" }, "r1")).rejects.toBeInstanceOf(
        AuthorizationError
      );
    });
  }
});

describe("assertCanWriteTargetList (created_by only, no assigned_to)", () => {
  const find = prismadb.crm_TargetLists.findFirst as jest.Mock;

  it("admin: bare id+deletedAt", async () => {
    find.mockResolvedValue({ id: "l1" });
    await assertCanWriteTargetList({ id: "u", role: "admin" }, "l1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "l1", deletedAt: null },
      select: { id: true },
    });
  });

  it("user: scoped to created_by (no assigned_to clause)", async () => {
    find.mockResolvedValue({ id: "l1" });
    await assertCanWriteTargetList({ id: "u3", role: "user" }, "l1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "l1", deletedAt: null, created_by: "u3" },
      select: { id: true },
    });
  });

  it("throws when not in scope", async () => {
    find.mockResolvedValue(null);
    await expect(
      assertCanWriteTargetList({ id: "u3", role: "user" }, "l1")
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteCrmTask (createdBy OR user assignee, no deletedAt)", () => {
  const find = prismadb.crm_Accounts_Tasks.findFirst as jest.Mock;

  it("admin: bare id where (no deletedAt column on this model)", async () => {
    find.mockResolvedValue({ id: "t1" });
    await assertCanWriteCrmTask({ id: "u", role: "manager" }, "t1");
    expect(find).toHaveBeenCalledWith({ where: { id: "t1" }, select: { id: true } });
  });

  it("user: scoped to creator or assignee", async () => {
    find.mockResolvedValue({ id: "t1" });
    await assertCanWriteCrmTask({ id: "u3", role: "user" }, "t1");
    expect(find).toHaveBeenCalledWith({
      where: { id: "t1", OR: [{ createdBy: "u3" }, { user: "u3" }] },
      select: { id: true },
    });
  });

  it("throws when not creator/assignee", async () => {
    find.mockResolvedValue(null);
    await expect(
      assertCanWriteCrmTask({ id: "u3", role: "user" }, "t1")
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("line-item wrappers delegate to the parent write assert", () => {
  it("opportunity line-item: resolves parent then asserts opportunity write", async () => {
    (prismadb.crm_OpportunityLineItems.findUnique as jest.Mock).mockResolvedValue({
      opportunityId: "opp1",
    });
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({ id: "opp1" });
    await assertCanWriteOpportunityLineItem({ id: "u3", role: "user" }, "li1");
    expect(prismadb.crm_OpportunityLineItems.findUnique).toHaveBeenCalledWith({
      where: { id: "li1" },
      select: { opportunityId: true },
    });
    // parent write assert ran against the resolved opportunityId
    expect(prismadb.crm_Opportunities.findFirst).toHaveBeenCalled();
  });

  it("opportunity line-item: throws when the line item does not exist", async () => {
    (prismadb.crm_OpportunityLineItems.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      assertCanWriteOpportunityLineItem({ id: "u3", role: "user" }, "missing")
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("contract line-item: resolves parent then asserts contract write", async () => {
    (prismadb.crm_ContractLineItems.findUnique as jest.Mock).mockResolvedValue({
      contractId: "ct1",
    });
    (prismadb.crm_Contracts.findFirst as jest.Mock).mockResolvedValue({ id: "ct1" });
    await assertCanWriteContractLineItem({ id: "u3", role: "user" }, "cli1");
    expect(prismadb.crm_ContractLineItems.findUnique).toHaveBeenCalledWith({
      where: { id: "cli1" },
      select: { contractId: true },
    });
    expect(prismadb.crm_Contracts.findFirst).toHaveBeenCalled();
  });

  it("contract line-item: throws when the line item does not exist", async () => {
    (prismadb.crm_ContractLineItems.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      assertCanWriteContractLineItem({ id: "u3", role: "user" }, "missing")
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
