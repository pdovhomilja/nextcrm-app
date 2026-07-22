// Object-level authorization regression tests for contact write actions
// (GHSA-qwhm-9fcm-p878). Each denial test must fail against the pre-guard code.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteContact: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  assertCanWriteOpportunity: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
// Pre-guard code still imports getSession (ESM); mock so the suite loads during
// RED. Harmless after implementation, which drops the auth-server import.
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: "owner" } }),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: {
      update: jest.fn().mockResolvedValue({ id: "c-1" }),
      findUnique: jest.fn().mockResolvedValue({ id: "c-1" }),
      create: jest.fn().mockResolvedValue({ id: "c-1" }),
    },
    contactsToOpportunities: { delete: jest.fn().mockResolvedValue({}) },
    users: { findFirst: jest.fn().mockResolvedValue(null) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn() }));

import {
  requireAuthenticated,
  assertCanWriteContact,
  assertCanWriteAccount,
  assertCanWriteOpportunity,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { createContact } from "@/actions/crm/contacts/create-contact";
import { updateContact } from "@/actions/crm/contacts/update-contact";
import { deleteContact } from "@/actions/crm/contacts/delete-contact";
import { unlinkOpportunity } from "@/actions/crm/contacts/unlink-opportunity";

const authed = requireAuthenticated as jest.Mock;
const assertContact = assertCanWriteContact as jest.Mock;
const assertAccount = assertCanWriteAccount as jest.Mock;
const assertOpp = assertCanWriteOpportunity as jest.Mock;
const cUpdate = prismadb.crm_Contacts.update as jest.Mock;
const cCreate = prismadb.crm_Contacts.create as jest.Mock;
const linkDelete = prismadb.contactsToOpportunities.delete as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertContact.mockResolvedValue(undefined);
  assertAccount.mockResolvedValue(undefined);
  assertOpp.mockResolvedValue(undefined);
});

describe("updateContact", () => {
  it("denies a non-owner and does not update", async () => {
    assertContact.mockRejectedValue(new AuthorizationError());
    const res = await updateContact({ id: "victim" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(cUpdate).not.toHaveBeenCalled();
  });

  it("guards on data.id and updates for an owner", async () => {
    await updateContact({ id: "c-1", first_name: "New" } as any);
    expect(assertContact).toHaveBeenCalledWith(OWNER, "c-1");
    expect(cUpdate).toHaveBeenCalled();
  });

  it("also requires write on a newly-linked account (parent-write)", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await updateContact({ id: "c-1", assigned_account: "foreign-acc" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "foreign-acc");
    expect(cUpdate).not.toHaveBeenCalled();
  });
});

describe("deleteContact", () => {
  it("denies a non-owner and does not soft-delete", async () => {
    assertContact.mockRejectedValue(new AuthorizationError());
    const res = await deleteContact("victim");
    expect(res).toEqual({ error: "Forbidden" });
    expect(cUpdate).not.toHaveBeenCalled();
  });

  it("guards on the contactId for an owner", async () => {
    await deleteContact("c-1");
    expect(assertContact).toHaveBeenCalledWith(OWNER, "c-1");
    expect(cUpdate).toHaveBeenCalled();
  });
});

describe("unlinkOpportunity (both sides of the junction must be writable)", () => {
  it("denies when the contact is not writable", async () => {
    assertContact.mockRejectedValue(new AuthorizationError());
    const res = await unlinkOpportunity({ contactId: "c-1", opportunityId: "o-1" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(linkDelete).not.toHaveBeenCalled();
  });

  it("denies when the opportunity is not writable", async () => {
    assertOpp.mockRejectedValue(new AuthorizationError());
    const res = await unlinkOpportunity({ contactId: "c-1", opportunityId: "o-1" });
    expect(res).toEqual({ error: "Forbidden" });
    expect(linkDelete).not.toHaveBeenCalled();
  });

  it("deletes when both are writable", async () => {
    await unlinkOpportunity({ contactId: "c-1", opportunityId: "o-1" });
    expect(assertContact).toHaveBeenCalledWith(OWNER, "c-1");
    expect(assertOpp).toHaveBeenCalledWith(OWNER, "o-1");
    expect(linkDelete).toHaveBeenCalled();
  });
});

describe("createContact", () => {
  it("requires write on a linked account (parent-write) and does not create on denial", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await createContact({ last_name: "X", assigned_account: "foreign-acc" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "foreign-acc");
    expect(cCreate).not.toHaveBeenCalled();
  });

  it("plain create (no linked account) needs only authentication", async () => {
    await createContact({ last_name: "X" } as any);
    expect(assertAccount).not.toHaveBeenCalled();
    expect(cCreate).toHaveBeenCalled();
  });
});
