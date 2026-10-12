// Regression tests for GHSA-q96c-2vj9-8v7f: MCP target-list tools must scope
// to the caller so a normal user cannot list, read or change others' lists.
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_TargetLists: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    targetsToTargetLists: { createMany: jest.fn(), deleteMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { crmTargetListTools } from "@/lib/mcp/tools/crm-target-lists";

type Role = "user" | "manager" | "admin";
const USER = { id: "u1", role: "user" as Role };
const MANAGER = { id: "m1", role: "manager" as Role };
const LIST_ID = "11111111-1111-4111-8111-111111111111";

const run = (name: string, args: any, user: { id: string; role: Role }) => {
  const t = crmTargetListTools.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return (t.handler as any)(args, user.id, user);
};

beforeEach(() => jest.clearAllMocks());

describe("crm_list_target_lists scope", () => {
  it("normal user is scoped to created_by = own id", async () => {
    (prismadb.crm_TargetLists.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_TargetLists.count as jest.Mock).mockResolvedValue(0);
    await run("crm_list_target_lists", { limit: 20, offset: 0 }, USER);
    const where = (prismadb.crm_TargetLists.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where).toEqual({ deletedAt: null, created_by: "u1" });
  });

  it("manager sees all", async () => {
    (prismadb.crm_TargetLists.findMany as jest.Mock).mockResolvedValue([]);
    (prismadb.crm_TargetLists.count as jest.Mock).mockResolvedValue(0);
    await run("crm_list_target_lists", { limit: 20, offset: 0 }, MANAGER);
    const where = (prismadb.crm_TargetLists.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where).toEqual({ deletedAt: null });
  });
});

describe("crm_get_target_list scope", () => {
  it("normal user lookup carries created_by", async () => {
    (prismadb.crm_TargetLists.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(
      run("crm_get_target_list", { id: LIST_ID, limit: 20, offset: 0 }, USER),
    ).rejects.toThrow();
    const where = (prismadb.crm_TargetLists.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where).toEqual({ id: LIST_ID, deletedAt: null, created_by: "u1" });
  });
});

describe.each([
  ["crm_update_target_list", { id: LIST_ID, name: "x" }, "update"],
  ["crm_delete_target_list", { id: LIST_ID }, "update"],
  ["crm_add_to_target_list", { target_list_id: LIST_ID, target_ids: [LIST_ID] }, "createMany"],
  ["crm_remove_from_target_list", { target_list_id: LIST_ID, target_ids: [LIST_ID] }, "deleteMany"],
] as const)("%s scope", (name, args, op) => {
  const writeMock = () =>
    op === "update"
      ? (prismadb.crm_TargetLists.update as jest.Mock)
      : ((prismadb.targetsToTargetLists as any)[op] as jest.Mock);

  it("normal user cannot touch another user's list", async () => {
    (prismadb.crm_TargetLists.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(run(name, args, USER)).rejects.toThrow();
    const where = (prismadb.crm_TargetLists.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where).toEqual({ id: LIST_ID, deletedAt: null, created_by: "u1" });
    expect(writeMock()).not.toHaveBeenCalled();
  });

  it("manager can act on any list", async () => {
    (prismadb.crm_TargetLists.findFirst as jest.Mock).mockResolvedValue({ id: LIST_ID });
    (prismadb.crm_TargetLists.update as jest.Mock).mockResolvedValue({ id: LIST_ID, deletedAt: null });
    await run(name, args, MANAGER);
    const where = (prismadb.crm_TargetLists.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where).toEqual({ id: LIST_ID, deletedAt: null });
    expect(writeMock()).toHaveBeenCalled();
  });
});
