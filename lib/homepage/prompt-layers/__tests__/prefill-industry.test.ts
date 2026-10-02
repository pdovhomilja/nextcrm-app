jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Ai_Prompt: { findMany: jest.fn() } },
}));
import { prismadb } from "@/lib/prisma";
import { resolveIndustryPromptId, createIndustryMatcher } from "../prefill-industry";

const findMany = prismadb.crm_Ai_Prompt.findMany as jest.Mock;
const LIB = [
  { id: "dental", name: "Dental" },
  { id: "salon", name: "Salon, spa & beauty (hair, nails)" },
  { id: "generic", name: "Generic" },
];

beforeEach(() => {
  jest.clearAllMocks();
  findMany.mockResolvedValue(LIB);
});

describe("resolveIndustryPromptId", () => {
  it("matches free-text industry against active ORG industry prompts", async () => {
    expect(await resolveIndustryPromptId("Nail salon")).toBe("salon");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { kind: "HOMEPAGE_INDUSTRY", scope: "ORG", deletedAt: null },
      }),
    );
  });

  it("returns null without querying when there is no industry text", async () => {
    expect(await resolveIndustryPromptId(undefined)).toBeNull();
    expect(await resolveIndustryPromptId("  ")).toBeNull();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns null on no match", async () => {
    expect(await resolveIndustryPromptId("Quantum cryptography")).toBeNull();
  });

  it("is best-effort: a DB failure yields null, never throws", async () => {
    findMany.mockRejectedValue(new Error("db down"));
    await expect(resolveIndustryPromptId("Dentist")).resolves.toBeNull();
  });
});

describe("createIndustryMatcher", () => {
  it("loads the library once and matches many rows", async () => {
    const match = await createIndustryMatcher();
    expect(match("Dentist")).toBe("dental");
    expect(match("Hair salon")).toBe("salon");
    expect(match(null)).toBeNull();
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("degrades to an always-null matcher when the library can't load", async () => {
    findMany.mockRejectedValue(new Error("db down"));
    const match = await createIndustryMatcher();
    expect(match("Dentist")).toBeNull();
  });
});
