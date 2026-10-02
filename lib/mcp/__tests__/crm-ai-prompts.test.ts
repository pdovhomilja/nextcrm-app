jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Ai_Prompt: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
import { prismadb } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { crmAiPromptTools } from "@/lib/mcp/tools/crm-ai-prompts";

const list = crmAiPromptTools.find((t) => t.name === "crm_list_prompts")!;
const create = crmAiPromptTools.find((t) => t.name === "crm_create_prompt")!;
const del = crmAiPromptTools.find((t) => t.name === "crm_delete_prompt")!;

beforeEach(() => jest.clearAllMocks());

it("lists org + personal prompts scoped to the user", async () => {
  (prismadb.crm_Ai_Prompt.findMany as jest.Mock).mockResolvedValue([{ id: "p1" }]);
  (prismadb.crm_Ai_Prompt.count as jest.Mock).mockResolvedValue(1);
  await list.handler({ kind: "EMAIL", limit: 50, offset: 0 } as never, "u1");
  expect(prismadb.crm_Ai_Prompt.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        kind: "EMAIL",
        OR: [{ scope: "ORG" }, { scope: "USER", user_id: "u1" }],
      }),
    })
  );
});

it("creates a personal prompt owned by the user", async () => {
  (prismadb.crm_Ai_Prompt.create as jest.Mock).mockResolvedValue({ id: "p2" });
  await create.handler({ name: "N", body: "B", kind: "EMAIL" } as never, "u1");
  expect(prismadb.crm_Ai_Prompt.create).toHaveBeenCalledWith({
    data: { name: "N", body: "B", kind: "EMAIL", scope: "USER", user_id: "u1", created_by: "u1" },
  });
  expect(writeAuditLog).toHaveBeenCalledWith(
    expect.objectContaining({ entityType: "prompt", entityId: "p2", action: "created", userId: "u1" })
  );
});

it("delete only looks up the caller's own personal prompts", async () => {
  (prismadb.crm_Ai_Prompt.findFirst as jest.Mock).mockResolvedValue({ id: "p3" });
  (prismadb.crm_Ai_Prompt.update as jest.Mock).mockResolvedValue({ id: "p3" });
  await del.handler({ id: "p3" } as never, "u1");
  expect(prismadb.crm_Ai_Prompt.findFirst).toHaveBeenCalledWith({
    where: { id: "p3", scope: "USER", user_id: "u1", deletedAt: null },
  });
  expect(prismadb.crm_Ai_Prompt.update).toHaveBeenCalledWith({
    where: { id: "p3" },
    data: { deletedAt: expect.any(Date), deletedBy: "u1" },
  });
  expect(writeAuditLog).toHaveBeenCalledWith(
    expect.objectContaining({ entityType: "prompt", entityId: "p3", action: "deleted", userId: "u1" })
  );
});

it("delete of another user's / org prompt is NOT_FOUND and does not update", async () => {
  (prismadb.crm_Ai_Prompt.findFirst as jest.Mock).mockResolvedValue(null);
  await expect(del.handler({ id: "p4" } as never, "u1")).rejects.toThrow("NOT_FOUND");
  expect(prismadb.crm_Ai_Prompt.update).not.toHaveBeenCalled();
  expect(writeAuditLog).not.toHaveBeenCalled();
});

describe("homepage layer kinds over MCP", () => {
  it.each(["HOMEPAGE_INDUSTRY", "HOMEPAGE_STYLE", "HOMEPAGE_AVOID"] as const)(
    "list accepts %s and filters by it with deletedAt:null",
    async (kind) => {
      expect(list.schema.safeParse({ kind }).success).toBe(true);
      (prismadb.crm_Ai_Prompt.findMany as jest.Mock).mockResolvedValue([]);
      (prismadb.crm_Ai_Prompt.count as jest.Mock).mockResolvedValue(0);
      await list.handler({ kind, limit: 50, offset: 0 } as never, "u1");
      expect(prismadb.crm_Ai_Prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null, kind }) })
      );
    }
  );

  it.each(["HOMEPAGE_INDUSTRY", "HOMEPAGE_STYLE", "HOMEPAGE_AVOID", "HOMEPAGE_BASE"])(
    "create rejects admin-only kind %s (MCP only makes personal prompts)",
    (kind) => {
      expect(create.schema.safeParse({ name: "N", body: "B", kind }).success).toBe(false);
    }
  );
});
