// Create-time pre-match: every server-side target create path pre-fills
// homepage_industry_prompt_id from the free-text industry (best-effort).

jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { create: jest.fn(), createMany: jest.fn(), findMany: jest.fn() },
    crm_Ai_Prompt: { findMany: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(async () => ({ id: "u1", role: "admin" })),
  AuthenticationError: class AuthenticationError extends Error {},
}));

import { prismadb } from "@/lib/prisma";
import { createTarget } from "@/actions/crm/targets/create-target";
import { importTargets } from "@/actions/crm/targets/import-targets";
import { crmTargetTools } from "@/lib/mcp/tools/crm-targets";

const create = prismadb.crm_Targets.create as jest.Mock;
const createMany = prismadb.crm_Targets.createMany as jest.Mock;
const promptsFindMany = prismadb.crm_Ai_Prompt.findMany as jest.Mock;

const LIB = [
  { id: "p-dental", name: "Dental" },
  { id: "p-salon", name: "Salon, spa & beauty (hair, nails)" },
  { id: "p-generic", name: "Generic" },
];

beforeEach(() => {
  jest.clearAllMocks();
  promptsFindMany.mockResolvedValue(LIB);
  create.mockImplementation(({ data }: any) => ({ id: "t1", ...data }));
  createMany.mockResolvedValue({ count: 1 });
  (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([]);
});

describe("createTarget action", () => {
  it("pre-fills homepage_industry_prompt_id from the industry text", async () => {
    await createTarget({ company: "Glow Nails", industry: "Nail salon" });
    expect(create.mock.calls[0][0].data.homepage_industry_prompt_id).toBe("p-salon");
  });

  it("leaves it unset on no match / no industry", async () => {
    await createTarget({ company: "Acme", industry: "Quantum cryptography" });
    expect(create.mock.calls[0][0].data).not.toHaveProperty("homepage_industry_prompt_id");
    await createTarget({ company: "Acme" });
    expect(create.mock.calls[1][0].data).not.toHaveProperty("homepage_industry_prompt_id");
  });

  it("still creates the target when the prompt library can't be read", async () => {
    promptsFindMany.mockRejectedValue(new Error("db down"));
    const res = await createTarget({ company: "Acme", industry: "Dentist" });
    expect(res.error).toBeUndefined();
    expect(create).toHaveBeenCalled();
  });
});

describe("crm_create_target MCP tool", () => {
  it("pre-fills homepage_industry_prompt_id from the industry text", async () => {
    const tool = crmTargetTools.find((t) => t.name === "crm_create_target")!;
    await (tool.handler as any)(
      (tool.schema as any).parse({ company: "Smile Co", industry: "Dentist" }),
      "u1",
    );
    expect(create.mock.calls[0][0].data.homepage_industry_prompt_id).toBe("p-dental");
  });
});

describe("importTargets", () => {
  it("pre-fills per row, leaving unmatched rows unset", async () => {
    const fd = new FormData();
    fd.append(
      "file",
      new File(["company,industry\nSmile Co,Dentist\nMystery Inc,Quantum"], "t.csv", {
        type: "text/csv",
      }),
    );
    await importTargets(fd);
    const rows = createMany.mock.calls[0][0].data;
    expect(rows[0].homepage_industry_prompt_id).toBe("p-dental");
    expect(rows[1]).not.toHaveProperty("homepage_industry_prompt_id");
    expect(promptsFindMany).toHaveBeenCalledTimes(1);
  });
});
