jest.mock("@/lib/prisma", () => ({ prismadb: { crm_Targets: { create: jest.fn() } } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(async () => ({ id: "u1" })),
  AuthenticationError: class extends Error {},
}));
import { prismadb } from "@/lib/prisma";
import { createTarget } from "@/actions/crm/targets/create-target";

beforeEach(() => {
  jest.clearAllMocks();
  (prismadb.crm_Targets.create as jest.Mock).mockImplementation(({ data }: any) => ({ id: "t1", ...data }));
});

it("rejects a COMPANY target with no company name", async () => {
  const res = await createTarget({ type: "COMPANY", last_name: "X" });
  expect(res.error).toMatch(/company/i);
  expect(prismadb.crm_Targets.create).not.toHaveBeenCalled();
});

it("creates an INDIVIDUAL and persists description pass-through", async () => {
  const res = await createTarget({ type: "INDIVIDUAL", last_name: "Lovelace", description: "note" });
  expect(res.data?.type).toBe("INDIVIDUAL");
  expect(res.data?.description).toBe("note");
});

it("rejects an INDIVIDUAL target with no last name", async () => {
  const res = await createTarget({ type: "INDIVIDUAL", company: "Acme" });
  expect(res.error).toMatch(/last name/i);
  expect(prismadb.crm_Targets.create).not.toHaveBeenCalled();
});

it("defaults an omitted type to COMPANY and persists it", async () => {
  const res = await createTarget({ company: "Acme Inc" });
  expect(res.error).toBeUndefined();
  expect(res.data?.type).toBe("COMPANY");
});
