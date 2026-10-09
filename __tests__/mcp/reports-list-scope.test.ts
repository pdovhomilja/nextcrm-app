// reports_list used to return every saved report config regardless of owner,
// while the web report pages show users only their own and shared ones.

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Report_Config: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

import { prismadb } from "@/lib/prisma";
import { reportTools } from "@/lib/mcp/tools/reports";

type Role = "user" | "manager" | "admin";
const list = (args: any, user: { id: string; role: Role }) => {
  const t = reportTools.find((x) => x.name === "reports_list")!;
  return (t.handler as any)({ limit: 20, offset: 0, ...args }, user.id, user);
};
const findMany = prismadb.crm_Report_Config.findMany as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("reports_list scope", () => {
  it("limits role user to own and shared configs", async () => {
    await list({ category: "sales" }, { id: "u1", role: "user" });
    expect(findMany.mock.calls[0][0].where).toEqual({
      category: "sales",
      OR: [{ createdBy: "u1" }, { isShared: true }],
    });
  });

  it.each(["manager", "admin"] as Role[])("lets %s see all configs", async (role) => {
    await list({}, { id: "m1", role });
    expect(findMany.mock.calls[0][0].where).toEqual({});
  });
});
