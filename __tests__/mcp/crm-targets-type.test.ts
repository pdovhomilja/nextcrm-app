jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Targets: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() } },
}));
import { prismadb } from "@/lib/prisma";
import { crmTargetTools } from "@/lib/mcp/tools/crm-targets";

const USER = "u1";
const createThroughSchema = (args: unknown) => {
  const tool = crmTargetTools.find((t) => t.name === "crm_create_target")!;
  return (tool.handler as any)((tool.schema as any).parse(args), USER);
};

beforeEach(() => {
  jest.clearAllMocks();
  (prismadb.crm_Targets.create as jest.Mock).mockImplementation(({ data }: any) => ({ id: "t1", ...data }));
});

it("creates a COMPANY target with only a company name", async () => {
  await createThroughSchema({ type: "COMPANY", company: "Acme Inc" });
  const data = (prismadb.crm_Targets.create as jest.Mock).mock.calls[0][0].data;
  expect(data.type).toBe("COMPANY");
  expect(data.company).toBe("Acme Inc");
  expect(data.last_name).toBe("");
});

it("creates an INDIVIDUAL target with only a last name", async () => {
  await createThroughSchema({ type: "INDIVIDUAL", last_name: "Lovelace" });
  const data = (prismadb.crm_Targets.create as jest.Mock).mock.calls[0][0].data;
  expect(data.type).toBe("INDIVIDUAL");
  expect(data.last_name).toBe("Lovelace");
});

it("rejects a COMPANY with no company name", async () => {
  await expect(createThroughSchema({ type: "COMPANY", last_name: "Lovelace" }))
    .rejects.toThrow(/company/i);
  expect(prismadb.crm_Targets.create).not.toHaveBeenCalled();
});

it("rejects an INDIVIDUAL with no last name", async () => {
  await expect(createThroughSchema({ type: "INDIVIDUAL", company: "Acme" }))
    .rejects.toThrow(/last name/i);
});

it("defaults type to COMPANY when omitted", async () => {
  await createThroughSchema({ company: "Acme Inc" });
  expect((prismadb.crm_Targets.create as jest.Mock).mock.calls[0][0].data.type).toBe("COMPANY");
});
