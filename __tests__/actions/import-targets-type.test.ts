jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { createMany: jest.fn(), findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { requireAuthenticated } from "@/lib/authz";
import { importTargets } from "@/actions/crm/targets/import-targets";

describe("importTargets type column", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "u1", role: "admin" });
    (prismadb.crm_Targets.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([]);
  });

  const makeFormData = (csv: string) => {
    const fd = new FormData();
    fd.append("file", new File([csv], "targets.csv", { type: "text/csv" }));
    return fd;
  };

  const importedRows = () =>
    (prismadb.crm_Targets.createMany as jest.Mock).mock.calls[0][0].data;

  it("imports a row with type INDIVIDUAL as INDIVIDUAL", async () => {
    await importTargets(makeFormData("type,first_name,last_name\nINDIVIDUAL,Jane,Doe"));
    expect(importedRows()[0].type).toBe("INDIVIDUAL");
  });

  it("defaults a row with no type to COMPANY", async () => {
    await importTargets(makeFormData("company\nAcme Inc"));
    expect(importedRows()[0].type).toBe("COMPANY");
  });

  it("falls back to COMPANY for a garbage type value", async () => {
    await importTargets(makeFormData("type,company\nBANANA,Acme Inc"));
    expect(importedRows()[0].type).toBe("COMPANY");
  });

  it("accepts a case-insensitive, whitespace-padded type value", async () => {
    await importTargets(makeFormData("type,last_name\n individual ,Doe"));
    expect(importedRows()[0].type).toBe("INDIVIDUAL");
  });
});
