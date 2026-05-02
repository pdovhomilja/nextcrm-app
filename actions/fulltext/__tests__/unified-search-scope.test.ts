jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/inngest/lib/embedding-utils", () => ({
  generateEmbedding: jest.fn().mockRejectedValue(new Error("no embedding")),
  toVectorLiteral: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    crm_Accounts: { findMany: jest.fn().mockResolvedValue([]) },
    crm_Contacts: { findMany: jest.fn().mockResolvedValue([]) },
    crm_Leads: { findMany: jest.fn().mockResolvedValue([]) },
    crm_Opportunities: { findMany: jest.fn().mockResolvedValue([]) },
    boards: { findMany: jest.fn().mockResolvedValue([]) },
    tasks: { findMany: jest.fn().mockResolvedValue([]) },
    documents: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  },
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { unifiedSearch } from "../unified-search";

const gs = getSession as jest.MockedFunction<typeof getSession>;
const fu = prismadb.users.findUnique as jest.MockedFunction<typeof prismadb.users.findUnique>;
const userFind = prismadb.users.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("unifiedSearch user-directory gating", () => {
  it("user role: users facet returns empty without hitting users.findMany", async () => {
    gs.mockResolvedValue({ user: { id: "u1" } } as any);
    fu.mockResolvedValue({ id: "u1", role: "user" } as any);

    const result = (await unifiedSearch("hello", "en")) as any;
    expect(result.error).toBeUndefined();
    expect(result.users).toEqual([]);
    expect(userFind).not.toHaveBeenCalled();
  });
});
