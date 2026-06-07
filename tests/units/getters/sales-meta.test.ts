import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities_Sales_Stages: {
      findMany: vi.fn(),
    },
    crm_Opportunities_Type: {
      findMany: vi.fn(),
    },
  },
}));

import { getSaleStages } from "@/actions/crm/get-sales-stage";
import { getSalesType } from "@/actions/crm/get-sales-type";
import { prismadb } from "@/lib/prisma";

describe("getSaleStages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns sale stages ordered by probability", async () => {
    const stages = [
      { id: "s1", name: "Prospecting", probability: 10 },
      { id: "s2", name: "Closed", probability: 100 },
    ];
    (prismadb.crm_Opportunities_Sales_Stages.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(stages);
    const res = await getSaleStages();
    expect(res).toEqual(stages);
    expect(prismadb.crm_Opportunities_Sales_Stages.findMany).toHaveBeenCalledWith({
      orderBy: { probability: "asc" },
    });
  });
});

describe("getSalesType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all sales types", async () => {
    const types = [
      { id: "t1", name: "New Business" },
      { id: "t2", name: "Existing Business" },
    ];
    (prismadb.crm_Opportunities_Type.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(types);
    const res = await getSalesType();
    expect(res).toEqual(types);
    expect(prismadb.crm_Opportunities_Type.findMany).toHaveBeenCalledWith({});
  });
});
