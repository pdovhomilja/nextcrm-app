// Object-level authorization regression tests for lead write actions
// (GHSA-qwhm-9fcm-p878). Denial tests must fail against the pre-guard code.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteLead: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: "owner" } }),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: {
      create: jest.fn().mockResolvedValue({ id: "l-1" }),
      update: jest.fn().mockResolvedValue({ id: "l-1" }),
      findUnique: jest.fn().mockResolvedValue({ id: "l-1" }),
    },
    users: { findFirst: jest.fn().mockResolvedValue(null) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn() }));

import {
  requireAuthenticated,
  assertCanWriteLead,
  assertCanWriteAccount,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { createLead } from "@/actions/crm/leads/create-lead";
import { updateLead } from "@/actions/crm/leads/update-lead";
import { deleteLead } from "@/actions/crm/leads/delete-lead";

const authed = requireAuthenticated as jest.Mock;
const assertLead = assertCanWriteLead as jest.Mock;
const assertAccount = assertCanWriteAccount as jest.Mock;
const lCreate = prismadb.crm_Leads.create as jest.Mock;
const lUpdate = prismadb.crm_Leads.update as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertLead.mockResolvedValue(undefined);
  assertAccount.mockResolvedValue(undefined);
});

describe("updateLead", () => {
  it("denies a non-owner and does not update", async () => {
    assertLead.mockRejectedValue(new AuthorizationError());
    const res = await updateLead({ id: "victim", lastName: "X" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertLead).toHaveBeenCalledWith(OWNER, "victim");
    expect(lUpdate).not.toHaveBeenCalled();
  });

  it("updates for an owner", async () => {
    await updateLead({ id: "l-1", lastName: "X" } as any);
    expect(assertLead).toHaveBeenCalledWith(OWNER, "l-1");
    expect(lUpdate).toHaveBeenCalled();
  });
});

describe("deleteLead", () => {
  it("denies a non-owner and does not soft-delete", async () => {
    assertLead.mockRejectedValue(new AuthorizationError());
    const res = await deleteLead("victim");
    expect(res).toEqual({ error: "Forbidden" });
    expect(lUpdate).not.toHaveBeenCalled();
  });

  it("soft-deletes for an owner", async () => {
    await deleteLead("l-1");
    expect(assertLead).toHaveBeenCalledWith(OWNER, "l-1");
    expect(lUpdate).toHaveBeenCalled();
  });
});

describe("createLead", () => {
  it("requires write on a linked account (parent-write) and does not create on denial", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await createLead({ last_name: "X", accountIDs: "foreign-acc" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "foreign-acc");
    expect(lCreate).not.toHaveBeenCalled();
  });

  it("plain create (no linked account) needs only authentication", async () => {
    await createLead({ last_name: "X" } as any);
    expect(assertAccount).not.toHaveBeenCalled();
    expect(lCreate).toHaveBeenCalled();
  });
});
