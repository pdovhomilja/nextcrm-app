jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { findMany: jest.fn() },
    crm_Contracts: { findMany: jest.fn() },
  },
}));
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn().mockResolvedValue({ id: "u1", role: "admin" }),
  opportunityReadScopeWhere: jest.fn(() => ({})),
  contractReadScopeWhere: jest.fn(() => ({})),
  assertCanReadAccount: jest.fn().mockResolvedValue(undefined),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));

import { prismadb } from "@/lib/prisma";
import { getOpportunitiesFull } from "@/actions/crm/get-opportunities-with-includes";
import {
  getContractsWithIncludes,
  getContractsByAccountId,
} from "@/actions/crm/get-contracts";

// Mimics Prisma's Decimal: an object with toNumber(), not serializable to RSC clients.
const fakeDecimal = (n: number) => ({ toNumber: () => n });

describe("CRM list fetches serialize Prisma Decimals for client components", () => {
  beforeEach(() => jest.clearAllMocks());

  it("getOpportunitiesFull returns plain numbers for Decimal fields", async () => {
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([
      {
        id: "o1",
        name: "Deal",
        budget: fakeDecimal(1000),
        expected_revenue: fakeDecimal(2500.5),
        snapshot_rate: fakeDecimal(24.5),
        close_date: new Date("2026-09-30"),
      },
    ]);

    const [opp] = (await getOpportunitiesFull()) as any[];

    expect(opp.budget).toBe(1000);
    expect(opp.expected_revenue).toBe(2500.5);
    expect(opp.snapshot_rate).toBe(24.5);
    expect(opp.close_date).toBeInstanceOf(Date);
  });

  it("getContractsWithIncludes returns plain numbers for Decimal fields", async () => {
    (prismadb.crm_Contracts.findMany as jest.Mock).mockResolvedValue([
      { id: "c1", title: "Contract", value: fakeDecimal(9999.99), snapshot_rate: null },
    ]);

    const [contract] = (await getContractsWithIncludes()) as any[];

    expect(contract.value).toBe(9999.99);
    expect(contract.snapshot_rate).toBeNull();
  });

  it("getContractsByAccountId returns plain numbers for Decimal fields", async () => {
    (prismadb.crm_Contracts.findMany as jest.Mock).mockResolvedValue([
      { id: "c2", title: "Contract 2", value: fakeDecimal(5) },
    ]);

    const [contract] = (await getContractsByAccountId("a1")) as any[];

    expect(contract.value).toBe(5);
  });
});
