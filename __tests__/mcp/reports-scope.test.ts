// reports_run used to call the report actions without a scope, so a "user"
// token got organisation-wide numbers while the CSV/PDF export was scoped.

const mockSales = { getOppsByMonth: jest.fn().mockResolvedValue([]) };
const mockUsers = { getUserGrowth: jest.fn().mockResolvedValue([]) };
jest.mock("@/actions/reports/sales", () => mockSales);
jest.mock("@/actions/reports/users", () => mockUsers);
jest.mock("@/lib/prisma", () => ({ prismadb: {} }));

import { reportTools } from "@/lib/mcp/tools/reports";
import { getReportScope } from "@/lib/authz/scopes/report-scope";

type Role = "user" | "manager" | "admin";
const run = (args: any, user: { id: string; role: Role }) => {
  const t = reportTools.find((x) => x.name === "reports_run")!;
  return (t.handler as any)(args, user.id, user);
};

beforeEach(() => jest.clearAllMocks());

describe("reports_run scope", () => {
  it("passes the caller's report scope (same as the export)", async () => {
    const member = { id: "u1", role: "user" as Role };
    await run({ category: "sales" }, member);
    expect(mockSales.getOppsByMonth).toHaveBeenCalledWith(
      expect.any(Object),
      getReportScope(member)
    );
  });

  it("rejects the users category for role user", async () => {
    await expect(run({ category: "users" }, { id: "u1", role: "user" })).rejects.toThrow("FORBIDDEN");
    expect(mockUsers.getUserGrowth).not.toHaveBeenCalled();
  });

  it("allows the users category for managers", async () => {
    await run({ category: "users" }, { id: "m1", role: "manager" });
    expect(mockUsers.getUserGrowth).toHaveBeenCalled();
  });
});
