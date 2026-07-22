// Object-level authorization regression tests for account write actions
// (GHSA-qwhm-9fcm-p878). Each test must fail against the pre-guard code:
// a non-owner must be denied AND the mutation must not run.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      update: jest.fn().mockResolvedValue({ id: "acc-1" }),
      findUnique: jest.fn().mockResolvedValue({ id: "acc-1" }),
      create: jest.fn().mockResolvedValue({ id: "acc-1" }),
    },
    crm_Accounts_Tasks: { create: jest.fn().mockResolvedValue({ id: "task-1" }) },
    users: { findUnique: jest.fn().mockResolvedValue({ email: "x@y.z", name: "X" }) },
    accountWatchers: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/junction-helpers", () => ({
  junctionTableHelpers: { addWatcher: jest.fn(() => ({})), removeAccountWatcher: jest.fn(() => ({})) },
}));
jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(async () => ({ emails: { send: jest.fn().mockResolvedValue({}) } })),
}));
jest.mock("@/emails/NewTaskFromCRM", () => ({ __esModule: true, default: () => null }));
jest.mock("@/emails/NewTaskFromCRMToWatchers", () => ({ __esModule: true, default: () => null }));

import {
  requireAuthenticated,
  assertCanWriteAccount,
  AuthorizationError,
} from "@/lib/authz";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { updateAccount } from "@/actions/crm/accounts/update-account";
import { deleteAccount } from "@/actions/crm/accounts/delete-account";
import { watchAccount } from "@/actions/crm/accounts/watch-account";
import { unwatchAccount } from "@/actions/crm/accounts/unwatch-account";
import { createTask } from "@/actions/crm/accounts/create-task";

const authed = requireAuthenticated as jest.Mock;
const assertAccount = assertCanWriteAccount as jest.Mock;
const getSess = getSession as jest.Mock;
const accUpdate = prismadb.crm_Accounts.update as jest.Mock;
const taskCreate = prismadb.crm_Accounts_Tasks.create as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  getSess.mockResolvedValue({ user: { id: "owner", name: "Owner", userLanguage: "en" } });
});

describe("updateAccount", () => {
  it("denies a non-owner and does not update", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await updateAccount({ id: "victim-acc" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(accUpdate).not.toHaveBeenCalled();
  });

  it("guards on data.id and updates for an owner", async () => {
    assertAccount.mockResolvedValue(undefined);
    await updateAccount({ id: "acc-1", name: "New" } as any);
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "acc-1");
    expect(accUpdate).toHaveBeenCalled();
  });
});

describe("deleteAccount", () => {
  it("denies a non-owner and does not soft-delete", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await deleteAccount("victim-acc");
    expect(res).toEqual({ error: "Forbidden" });
    expect(accUpdate).not.toHaveBeenCalled();
  });

  it("guards on the accountId and soft-deletes for an owner", async () => {
    assertAccount.mockResolvedValue(undefined);
    await deleteAccount("acc-1");
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "acc-1");
    expect(accUpdate).toHaveBeenCalled();
  });
});

describe("watchAccount / unwatchAccount (watch requires write — escalation guard)", () => {
  it("watch denies a non-owner and does not mutate", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await watchAccount("victim-acc");
    expect(res).toEqual({ error: "Forbidden" });
    expect(accUpdate).not.toHaveBeenCalled();
  });

  it("unwatch denies a non-owner and does not mutate", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await unwatchAccount("victim-acc");
    expect(res).toEqual({ error: "Forbidden" });
    expect(accUpdate).not.toHaveBeenCalled();
  });
});

describe("createTask", () => {
  const input = {
    title: "T",
    user: "assignee-id",
    priority: "normal",
    content: "c",
    account: "victim-acc",
  };

  it("denies when caller cannot write the parent account", async () => {
    assertAccount.mockRejectedValue(new AuthorizationError());
    const res = await createTask(input as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(taskCreate).not.toHaveBeenCalled();
  });

  it("guards on the parent account and stamps createdBy from the caller, not the input user", async () => {
    assertAccount.mockResolvedValue(undefined);
    await createTask({ ...input, account: "acc-1" } as any);
    expect(assertAccount).toHaveBeenCalledWith(OWNER, "acc-1");
    const arg = taskCreate.mock.calls[0][0].data;
    expect(arg.createdBy).toBe("owner"); // authenticated caller, NOT "assignee-id"
    expect(arg.user).toBe("assignee-id"); // input user is the assignee
  });
});
