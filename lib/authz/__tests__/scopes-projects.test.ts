import { AuthorizationError } from "../errors";

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    boards: { findFirst: jest.fn() },
    tasks: { findUnique: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import {
  boardReadScopeWhere,
  boardWriteScopeWhere,
  assertCanReadBoard,
  assertCanWriteBoard,
  assertCanReadTask,
  assertCanWriteTask,
} from "../scopes/crm";

const findBoard = prismadb.boards.findFirst as jest.MockedFunction<
  typeof prismadb.boards.findFirst
>;
const findTask = prismadb.tasks.findUnique as jest.MockedFunction<
  typeof prismadb.tasks.findUnique
>;

beforeEach(() => jest.clearAllMocks());

describe("boardReadScopeWhere", () => {
  it("admin → only deletedAt:null", () => {
    expect(boardReadScopeWhere({ id: "x", role: "admin" })).toEqual({
      deletedAt: null,
    });
  });
  it("manager → only deletedAt:null", () => {
    expect(boardReadScopeWhere({ id: "x", role: "manager" })).toEqual({
      deletedAt: null,
    });
  });
  it("user → deletedAt + OR with 4 branches (owner / shared / public / watcher)", () => {
    const w = boardReadScopeWhere({ id: "u1", role: "user" }) as {
      deletedAt: null;
      OR: unknown[];
    };
    expect(w.deletedAt).toBeNull();
    expect(w.OR).toEqual(
      expect.arrayContaining([
        { user: "u1" },
        { sharedWith: { has: "u1" } },
        { visibility: "public" },
        { watchers: { some: { user_id: "u1" } } },
      ]),
    );
    expect(w.OR).toHaveLength(4);
  });
});

describe("boardWriteScopeWhere", () => {
  it("admin → only deletedAt:null", () => {
    expect(boardWriteScopeWhere({ id: "x", role: "admin" })).toEqual({
      deletedAt: null,
    });
  });
  it("manager → only deletedAt:null", () => {
    expect(boardWriteScopeWhere({ id: "x", role: "manager" })).toEqual({
      deletedAt: null,
    });
  });
  it("user → owner only", () => {
    expect(boardWriteScopeWhere({ id: "u1", role: "user" })).toEqual({
      deletedAt: null,
      user: "u1",
    });
  });
});

describe("assertCanReadBoard", () => {
  it("admin: hit resolves", async () => {
    findBoard.mockResolvedValue({ id: "b1" } as never);
    await assertCanReadBoard({ id: "x", role: "admin" }, "b1");
    expect(findBoard).toHaveBeenCalledWith({
      where: { id: "b1", deletedAt: null },
      select: { id: true },
    });
  });
  it("user: scoped where with OR", async () => {
    findBoard.mockResolvedValue({ id: "b1" } as never);
    await assertCanReadBoard({ id: "u1", role: "user" }, "b1");
    const arg = findBoard.mock.calls[0][0]!;
    expect(arg.where).toMatchObject({ id: "b1", deletedAt: null });
    expect((arg.where as { OR?: unknown[] }).OR).toBeDefined();
  });
  it("throws on miss", async () => {
    findBoard.mockResolvedValue(null);
    await expect(
      assertCanReadBoard({ id: "u1", role: "user" }, "b1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteBoard", () => {
  it("user: where uses owner-only filter", async () => {
    findBoard.mockResolvedValue({ id: "b1" } as never);
    await assertCanWriteBoard({ id: "u1", role: "user" }, "b1");
    expect(findBoard).toHaveBeenCalledWith({
      where: { id: "b1", deletedAt: null, user: "u1" },
      select: { id: true },
    });
  });
  it("throws on miss", async () => {
    findBoard.mockResolvedValue(null);
    await expect(
      assertCanWriteBoard({ id: "u1", role: "user" }, "b1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanReadTask", () => {
  it("traverses task → section → board, delegates to board read", async () => {
    findTask.mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    } as never);
    findBoard.mockResolvedValue({ id: "b1" } as never);
    await assertCanReadTask({ id: "u1", role: "user" }, "t1");
    expect(findTask).toHaveBeenCalledWith({
      where: { id: "t1" },
      select: {
        assigned_section: {
          select: { board_relation: { select: { id: true } } },
        },
      },
    });
    expect(findBoard).toHaveBeenCalled();
  });
  it("throws when task missing", async () => {
    findTask.mockResolvedValue(null);
    await expect(
      assertCanReadTask({ id: "u1", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
  it("throws when section/board missing", async () => {
    findTask.mockResolvedValue({ assigned_section: null } as never);
    await expect(
      assertCanReadTask({ id: "u1", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
  it("throws when board read denied", async () => {
    findTask.mockResolvedValue({
      assigned_section: { board_relation: { id: "b1" } },
    } as never);
    findBoard.mockResolvedValue(null);
    await expect(
      assertCanReadTask({ id: "u1", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe("assertCanWriteTask", () => {
  it("user assignee bypass: resolves without board check", async () => {
    findTask.mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    } as never);
    await assertCanWriteTask({ id: "u1", role: "user" }, "t1");
    expect(findBoard).not.toHaveBeenCalled();
  });
  it("user non-assignee: delegates to board write", async () => {
    findTask.mockResolvedValue({
      user: "other",
      assigned_section: { board_relation: { id: "b1" } },
    } as never);
    findBoard.mockResolvedValue({ id: "b1" } as never);
    await assertCanWriteTask({ id: "u1", role: "user" }, "t1");
    expect(findBoard).toHaveBeenCalledWith({
      where: { id: "b1", deletedAt: null, user: "u1" },
      select: { id: true },
    });
  });
  it("admin: skips assignee bypass, delegates to board write (deletedAt only)", async () => {
    findTask.mockResolvedValue({
      user: "u1",
      assigned_section: { board_relation: { id: "b1" } },
    } as never);
    findBoard.mockResolvedValue({ id: "b1" } as never);
    await assertCanWriteTask({ id: "admin1", role: "admin" }, "t1");
    expect(findBoard).toHaveBeenCalledWith({
      where: { id: "b1", deletedAt: null },
      select: { id: true },
    });
  });
  it("throws when task missing", async () => {
    findTask.mockResolvedValue(null);
    await expect(
      assertCanWriteTask({ id: "u1", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
  it("throws when board denies", async () => {
    findTask.mockResolvedValue({
      user: "other",
      assigned_section: { board_relation: { id: "b1" } },
    } as never);
    findBoard.mockResolvedValue(null);
    await expect(
      assertCanWriteTask({ id: "u1", role: "user" }, "t1"),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
