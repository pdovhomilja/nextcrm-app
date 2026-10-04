jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Target_Homepage: { findMany: jest.fn() } },
}));

import { requireRole, AuthorizationError } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { getHomepageCostsForAdmin } from "@/actions/admin/homepage-costs";

const findMany = prismadb.crm_Target_Homepage.findMany as jest.Mock;
const role = requireRole as jest.Mock;

const ver = (over: Record<string, unknown>) => ({
  pass_kind: "AUTO",
  model: "claude-sonnet-5-5",
  created_at: new Date("2026-10-01"),
  input_tokens: 1_000_000,
  output_tokens: 1_000_000,
  cache_read_tokens: 0,
  cache_creation_tokens: 0,
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  role.mockResolvedValue({ id: "admin1", role: "admin" });
});

it("returns Forbidden for non-admins", async () => {
  role.mockRejectedValue(new AuthorizationError());
  expect(await getHomepageCostsForAdmin()).toEqual({ error: "Forbidden" });
});

it("aggregates per target and sorts by last generation, newest first", async () => {
  findMany.mockResolvedValue([
    {
      targetId: "t-old",
      target: { company: "Old Co" },
      versions: [ver({ created_at: new Date("2026-09-01") })],
    },
    {
      targetId: "t-new",
      target: { company: "New Co" },
      versions: [
        ver({ created_at: new Date("2026-10-05") }),
        ver({ created_at: new Date("2026-10-06") }),
      ],
    },
  ]);
  const res = await getHomepageCostsForAdmin();
  if ("error" in res) throw new Error("unexpected error");
  expect(res.data.map((r) => r.company)).toEqual(["New Co", "Old Co"]);
  expect(res.data[0].summary.generations).toBe(2);
  expect(res.data[1].summary.totalCostUsd).toBeCloseTo(12.0, 6); // 1M in x$2 + 1M out x$10
});

it("never selects the html column", async () => {
  findMany.mockResolvedValue([]);
  await getHomepageCostsForAdmin();
  const arg = findMany.mock.calls[0][0];
  expect(arg.select.versions.select.html).toBeUndefined();
  expect("html" in arg.select).toBe(false);
});
