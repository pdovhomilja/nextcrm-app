// Object-level authorization regression test for MCP projects_watch_board
// (GHSA-vq6p-3qj5-p666). Watching an unreadable board self-grants read scope
// (boardReadScopeWhere includes watchers) — an escalation primitive. Gate on read.

jest.mock("@/lib/authz", () => ({
  assertCanReadBoard: jest.fn(),
  AuthorizationError: jest.requireActual("@/lib/authz/errors").AuthorizationError,
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    boardWatchers: { create: jest.fn(), delete: jest.fn() },
  },
}));

import { assertCanReadBoard, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { projectTools } from "@/lib/mcp/tools/projects";

const USER = { id: "u1", role: "user" } as const;
function call(name: string, args: any) {
  const tool = projectTools.find((t) => t.name === name)!;
  return (tool.handler as any)(args, USER.id, USER);
}
const readBoard = assertCanReadBoard as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("projects_watch_board", () => {
  it("denies read on the board and does not create a watcher (escalation guard)", async () => {
    readBoard.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_watch_board", { board_id: "b-victim", watch: true })).rejects.toThrow("NOT_FOUND");
    expect(readBoard).toHaveBeenCalledWith(USER, "b-victim");
    expect(prismadb.boardWatchers.create).not.toHaveBeenCalled();
  });

  it("watches a readable board", async () => {
    readBoard.mockResolvedValue(undefined);
    (prismadb.boardWatchers.create as jest.Mock).mockResolvedValue({});
    await call("projects_watch_board", { board_id: "b-1", watch: true });
    expect(prismadb.boardWatchers.create).toHaveBeenCalled();
  });

  it("unwatch also requires read and is denied for an unreadable board", async () => {
    readBoard.mockRejectedValue(new AuthorizationError());
    await expect(call("projects_watch_board", { board_id: "b-victim", watch: false })).rejects.toThrow("NOT_FOUND");
    expect(prismadb.boardWatchers.delete).not.toHaveBeenCalled();
  });
});
