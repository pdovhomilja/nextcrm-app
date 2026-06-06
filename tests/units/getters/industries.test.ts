import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Industry_Type: {
      findMany: vi.fn(),
    },
  },
}));

import { getIndustries } from "@/actions/crm/get-industries";
import { prismadb } from "@/lib/prisma";

describe("getIndustries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all industries", async () => {
    const industries = [
      { id: "i1", name: "Technology" },
      { id: "i2", name: "Healthcare" },
    ];
    (prismadb.crm_Industry_Type.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(industries);
    const res = await getIndustries();
    expect(res).toEqual(industries);
    expect(prismadb.crm_Industry_Type.findMany).toHaveBeenCalledWith({});
  });

  it("returns empty array when no industries", async () => {
    (prismadb.crm_Industry_Type.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const res = await getIndustries();
    expect(res).toEqual([]);
  });
});
