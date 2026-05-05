import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: { findFirst: jest.fn() },
    crm_Contacts: { findFirst: jest.fn() },
    crm_Opportunities: { findFirst: jest.fn() },
    crm_Contracts: { findFirst: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  leadReadScopeWhere,
  contactReadScopeWhere,
  opportunityReadScopeWhere,
  contractReadScopeWhere,
  assertCanReadLead,
  assertCanReadOpportunity,
  assertCanReadContract,
} from "../scopes/crm";

const findLead = prismadb.crm_Leads.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Leads.findFirst
>;
const findOpp = prismadb.crm_Opportunities.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Opportunities.findFirst
>;
const findContract = prismadb.crm_Contracts.findFirst as jest.MockedFunction<
  typeof prismadb.crm_Contracts.findFirst
>;

beforeEach(() => jest.clearAllMocks());

const linkedAccountOR = (uid: string) => ({
  OR: expect.arrayContaining([
    { assigned_to: uid },
    { createdBy: uid },
    { watchers: { some: { user_id: uid } } },
  ]),
});

describe("leadReadScopeWhere", () => {
  it("admin/manager → only deletedAt:null", () => {
    expect(leadReadScopeWhere({ id: "x", role: "admin" })).toEqual({
      deletedAt: null,
    });
    expect(leadReadScopeWhere({ id: "x", role: "manager" })).toEqual({
      deletedAt: null,
    });
  });
  it("user → deletedAt + OR ownership + linked-account scope", () => {
    const w = leadReadScopeWhere({ id: "u1", role: "user" }) as any;
    expect(w.deletedAt).toBeNull();
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { assigned_accounts: linkedAccountOR("u1") },
      ]),
    );
  });
});

describe("contactReadScopeWhere", () => {
  it("admin/manager → only deletedAt:null", () => {
    expect(contactReadScopeWhere({ id: "x", role: "admin" })).toEqual({
      deletedAt: null,
    });
    expect(contactReadScopeWhere({ id: "x", role: "manager" })).toEqual({
      deletedAt: null,
    });
  });
  it("user → deletedAt + creator OR + linked-account scope", () => {
    const w = contactReadScopeWhere({ id: "u1", role: "user" }) as any;
    expect(w.deletedAt).toBeNull();
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { assigned_accounts: linkedAccountOR("u1") },
      ]),
    );
  });
});

describe("opportunityReadScopeWhere", () => {
  it("admin/manager → only deletedAt:null", () => {
    expect(opportunityReadScopeWhere({ id: "x", role: "admin" })).toEqual({
      deletedAt: null,
    });
    expect(opportunityReadScopeWhere({ id: "x", role: "manager" })).toEqual({
      deletedAt: null,
    });
  });
  it("user → deletedAt + creator OR + assigned_account linked scope", () => {
    const w = opportunityReadScopeWhere({ id: "u1", role: "user" }) as any;
    expect(w.deletedAt).toBeNull();
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { assigned_account: linkedAccountOR("u1") },
      ]),
    );
  });
});

describe("contractReadScopeWhere", () => {
  it("admin/manager → only deletedAt:null", () => {
    expect(contractReadScopeWhere({ id: "x", role: "admin" })).toEqual({
      deletedAt: null,
    });
    expect(contractReadScopeWhere({ id: "x", role: "manager" })).toEqual({
      deletedAt: null,
    });
  });
  it("user → deletedAt + OR ownership + assigned_account linked scope", () => {
    const w = contractReadScopeWhere({ id: "u1", role: "user" }) as any;
    expect(w.deletedAt).toBeNull();
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { assigned_account: linkedAccountOR("u1") },
      ]),
    );
  });
});

describe("assertCanReadLead", () => {
  it("admin: where { id, deletedAt:null }", async () => {
    findLead.mockResolvedValue({ id: "l1" } as any);
    await assertCanReadLead({ id: "x", role: "admin" }, "l1");
    expect(findLead).toHaveBeenCalledWith({
      where: { id: "l1", deletedAt: null },
      select: { id: true },
    });
  });
  it("user: where merges scope (200 hit)", async () => {
    findLead.mockResolvedValue({ id: "l1" } as any);
    await assertCanReadLead({ id: "u1", role: "user" }, "l1");
    const arg = findLead.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({ id: "l1", deletedAt: null });
    expect((arg.where as any).OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { assigned_accounts: linkedAccountOR("u1") },
      ]),
    );
  });
  it("throws AuthorizationError on miss (404)", async () => {
    findLead.mockResolvedValue(null);
    await expect(
      assertCanReadLead({ id: "u1", role: "user" }, "l1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanReadOpportunity", () => {
  it("admin: where { id, deletedAt:null }", async () => {
    findOpp.mockResolvedValue({ id: "o1" } as any);
    await assertCanReadOpportunity({ id: "x", role: "admin" }, "o1");
    expect(findOpp).toHaveBeenCalledWith({
      where: { id: "o1", deletedAt: null },
      select: { id: true },
    });
  });
  it("user: scoped where (200 hit)", async () => {
    findOpp.mockResolvedValue({ id: "o1" } as any);
    await assertCanReadOpportunity({ id: "u1", role: "user" }, "o1");
    const arg = findOpp.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({ id: "o1", deletedAt: null });
    expect((arg.where as any).OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { assigned_account: linkedAccountOR("u1") },
      ]),
    );
  });
  it("throws AuthorizationError on miss (404)", async () => {
    findOpp.mockResolvedValue(null);
    await expect(
      assertCanReadOpportunity({ id: "u1", role: "user" }, "o1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanReadContract", () => {
  it("admin: where { id, deletedAt:null }", async () => {
    findContract.mockResolvedValue({ id: "k1" } as any);
    await assertCanReadContract({ id: "x", role: "admin" }, "k1");
    expect(findContract).toHaveBeenCalledWith({
      where: { id: "k1", deletedAt: null },
      select: { id: true },
    });
  });
  it("user: scoped where (200 hit)", async () => {
    findContract.mockResolvedValue({ id: "k1" } as any);
    await assertCanReadContract({ id: "u1", role: "user" }, "k1");
    const arg = findContract.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({ id: "k1", deletedAt: null });
    expect((arg.where as any).OR).toEqual(
      expect.arrayContaining([
        { assigned_to: "u1" },
        { createdBy: "u1" },
        { assigned_account: linkedAccountOR("u1") },
      ]),
    );
  });
  it("throws AuthorizationError on miss (404)", async () => {
    findContract.mockResolvedValue(null);
    await expect(
      assertCanReadContract({ id: "u1", role: "user" }, "k1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
