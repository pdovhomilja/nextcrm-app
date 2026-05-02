jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    crm_Opportunities: { findFirst: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { getSimilarOpportunities } from "../get-similar-opportunities";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

beforeEach(() => jest.clearAllMocks());

describe("getSimilarOpportunities scope", () => {
  it("unauthenticated → empty records, no SQL", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    const res = await getSimilarOpportunities("o1");
    expect(res).toEqual({ status: "ok", records: [] });
    expect(prismadb.$queryRaw).not.toHaveBeenCalled();
  });

  it("user can't read base opportunity → empty records, no SQL", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await getSimilarOpportunities("o1");
    expect(res).toEqual({ status: "ok", records: [] });
    expect(prismadb.$queryRaw).not.toHaveBeenCalled();
  });

  it("in-scope user: returns only authorized similar candidates", async () => {
    mockUser("user", "u1");
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({ id: "o1" });
    (prismadb.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ embedding: "[0.1]" }])
      .mockResolvedValueOnce([
        { id: "p1", name: "P1", stage_name: null, similarity: 0.9 },
        { id: "p2", name: "P2", stage_name: null, similarity: 0.8 },
        { id: "p3", name: "P3", stage_name: null, similarity: 0.7 },
        { id: "p4", name: "P4", stage_name: null, similarity: 0.6 },
        { id: "p5", name: "P5", stage_name: null, similarity: 0.5 },
      ]);
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([
      { id: "p3" },
      { id: "p4" },
    ]);

    const res = await getSimilarOpportunities("o1", 5);
    if (res.status !== "ok") throw new Error("expected ok");
    expect(res.records.map((r) => r.id)).toEqual(["p3", "p4"]);
  });

  it("manager: returns unfiltered candidates", async () => {
    mockUser("manager", "m1");
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({ id: "o1" });
    (prismadb.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ embedding: "[0.1]" }])
      .mockResolvedValueOnce([
        { id: "p1", name: "P1", stage_name: null, similarity: 0.9 },
      ]);
    (prismadb.crm_Opportunities.findMany as jest.Mock).mockResolvedValue([{ id: "p1" }]);

    const res = await getSimilarOpportunities("o1");
    if (res.status !== "ok") throw new Error("expected ok");
    expect(res.records.map((r) => r.id)).toEqual(["p1"]);
  });
});
