// Object-level authorization regression tests for target-list write actions
// (GHSA-qwhm-9fcm-p878). Denial tests must fail against the pre-guard code.

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteTargetList: jest.fn(),
  filterAuthorizedTargetIds: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({
  getSession: jest.fn().mockResolvedValue({ user: { id: "owner" } }),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_TargetLists: {
      create: jest.fn().mockResolvedValue({ id: "tl-1", targets: [] }),
      update: jest.fn().mockResolvedValue({ id: "tl-1" }),
      findFirst: jest.fn().mockResolvedValue({ id: "tl-1" }),
    },
    targetsToTargetLists: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn().mockResolvedValue({}),
    },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import {
  requireAuthenticated,
  assertCanWriteTargetList,
  filterAuthorizedTargetIds,
  AuthorizationError,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { updateTargetList } from "@/actions/crm/target-lists/update-target-list";
import { deleteTargetList } from "@/actions/crm/target-lists/delete-target-list";
import { addTargetsToList } from "@/actions/crm/target-lists/add-targets-to-list";
import { removeTargetFromList } from "@/actions/crm/target-lists/remove-target-from-list";

const authed = requireAuthenticated as jest.Mock;
const assertList = assertCanWriteTargetList as jest.Mock;
const filterTargets = filterAuthorizedTargetIds as jest.Mock;
const tlUpdate = prismadb.crm_TargetLists.update as jest.Mock;
const linkCreateMany = prismadb.targetsToTargetLists.createMany as jest.Mock;
const linkDelete = prismadb.targetsToTargetLists.delete as jest.Mock;

const OWNER = { id: "owner", role: "user" };

beforeEach(() => {
  jest.clearAllMocks();
  authed.mockResolvedValue(OWNER);
  assertList.mockResolvedValue(undefined);
  filterTargets.mockImplementation(async (_u: any, ids: string[]) => ids);
});

describe("updateTargetList", () => {
  it("denies a non-owner and does not update", async () => {
    assertList.mockRejectedValue(new AuthorizationError());
    const res = await updateTargetList({ id: "victim" } as any);
    expect(res).toEqual({ error: "Forbidden" });
    expect(assertList).toHaveBeenCalledWith(OWNER, "victim");
    expect(tlUpdate).not.toHaveBeenCalled();
  });

  it("updates for an owner", async () => {
    await updateTargetList({ id: "tl-1", name: "New" } as any);
    expect(assertList).toHaveBeenCalledWith(OWNER, "tl-1");
    expect(tlUpdate).toHaveBeenCalled();
  });
});

describe("deleteTargetList", () => {
  it("denies a non-owner and does not soft-delete", async () => {
    assertList.mockRejectedValue(new AuthorizationError());
    const res = await deleteTargetList("victim");
    expect(res).toEqual({ error: "Forbidden" });
    expect(tlUpdate).not.toHaveBeenCalled();
  });

  it("soft-deletes for an owner", async () => {
    await deleteTargetList("tl-1");
    expect(assertList).toHaveBeenCalledWith(OWNER, "tl-1");
    expect(tlUpdate).toHaveBeenCalled();
  });
});

describe("addTargetsToList", () => {
  it("denies when the list is not writable and does not link", async () => {
    assertList.mockRejectedValue(new AuthorizationError());
    const res = await addTargetsToList("victim-list", ["t1"]);
    expect(res).toEqual({ error: "Forbidden" });
    expect(linkCreateMany).not.toHaveBeenCalled();
  });

  it("narrows the target ids to the authorized subset before linking", async () => {
    filterTargets.mockResolvedValue(["t1"]); // t2 filtered out
    await addTargetsToList("tl-1", ["t1", "t2"]);
    expect(filterTargets).toHaveBeenCalledWith(OWNER, ["t1", "t2"]);
    const arg = linkCreateMany.mock.calls[0][0];
    expect(arg.data).toEqual([{ target_id: "t1", target_list_id: "tl-1" }]);
  });
});

describe("removeTargetFromList", () => {
  it("denies when the list is not writable and does not delete the link", async () => {
    assertList.mockRejectedValue(new AuthorizationError());
    const res = await removeTargetFromList("victim-list", "t1");
    expect(res).toEqual({ error: "Forbidden" });
    expect(linkDelete).not.toHaveBeenCalled();
  });

  it("removes the link for an owner", async () => {
    await removeTargetFromList("tl-1", "t1");
    expect(assertList).toHaveBeenCalledWith(OWNER, "tl-1");
    expect(linkDelete).toHaveBeenCalled();
  });
});
