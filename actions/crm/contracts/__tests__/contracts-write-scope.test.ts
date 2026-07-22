// Object-level authorization regression tests for contract write actions
// (GHSA-qwhm-9fcm-p878). Denial tests must fail against the pre-guard code.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteContract: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { email: "owner@x.z" } }),
}));
jest.mock("@/lib/create-safe-action", () => ({
  createSafeAction: (_schema: unknown, handler: any) => handler,
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contracts: {
      create: jest.fn().mockResolvedValue({ id: "ct-1" }),
      update: jest.fn().mockResolvedValue({ id: "ct-1" }),
      findUnique: jest.fn().mockResolvedValue({ id: "ct-1" }),
    },
    users: { findUnique: jest.fn().mockResolvedValue({ id: "owner" }) },
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/lib/currency", () => ({
  getDefaultCurrency: jest.fn().mockResolvedValue("USD"),
  getSnapshotRate: jest.fn().mockResolvedValue(null),
}));

import {
  requireAuthenticated,
  assertCanWriteContract,
  assertCanWriteAccount,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { createNewContract } from "@/actions/crm/contracts/create-new-contract";
import { updateContract } from "@/actions/crm/contracts/update-contract";
import { deleteContract } from "@/actions/crm/contracts/delete-contract";

const authed = requireAuthenticated as jest.Mock;
const assertContract = assertCanWriteContract as jest.Mock;
const assertAccount = assertCanWriteAccount as jest.Mock;
const ctCreate = prismadb.crm_Contracts.create as jest.Mock;
const ctUpdate = prismadb.crm_Contracts.update as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertContract.mockResolvedValue(undefined);
  assertAccount.mockResolvedValue(undefined);
});

describe("updateContract", () => {
  it("denies a non-owner and does not update", async () => {
    assertContract.mockRejectedValue(new AuthorizationError());
    const res = await updateContract({ id: "victim", v: 0, title: "T", value: "100" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertContract).toHaveBeenCalledWith(OWNER, "victim");
    expect(ctUpdate).not.toHaveBeenCalled();
  });

  it("updates for an owner", async () => {
    await updateContract({ id: "ct-1", v: 0, title: "T", value: "100" } as any);
    expect(assertContract).toHaveBeenCalledWith(OWNER, "ct-1");
    expect(ctUpdate).toHaveBeenCalled();
  });
});

describe("deleteContract", () => {
  it("denies a non-owner and does not soft-delete", async () => {
    assertContract.mockRejectedValue(new AuthorizationError());
    const res = await deleteContract({ id: "victim" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(ctUpdate).not.toHaveBeenCalled();
  });

  it("soft-deletes for an owner", async () => {
    await deleteContract({ id: "ct-1" } as any);
    expect(assertContract).toHaveBeenCalledWith(OWNER, "ct-1");
    expect(ctUpdate).toHaveBeenCalled();
  });
});

describe("createNewContract", () => {
  it("requires write on a linked account (parent-write) and does not create on denial", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await createNewContract({ title: "T", value: "100", account: "foreign-acc" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "foreign-acc");
    expect(ctCreate).not.toHaveBeenCalled();
  });

  it("plain create (no linked account) needs only authentication", async () => {
    await createNewContract({ title: "T", value: "100" } as any);
    expect(assertAccount).not.toHaveBeenCalled();
    expect(ctCreate).toHaveBeenCalled();
  });
});
