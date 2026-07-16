jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: { createMany: jest.fn(), findMany: jest.fn() },
  },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { importTargets } from "@/actions/crm/targets/import-targets";

describe("importTargets suppression inheritance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
    (prismadb.crm_Targets.createMany as jest.Mock).mockResolvedValue({ count: 2 });
  });

  const makeFormData = (csv: string) => {
    const fd = new FormData();
    fd.append("file", new File([csv], "targets.csv", { type: "text/csv" }));
    return fd;
  };

  it("re-imported suppressed email is created with do_not_email=true", async () => {
    (prismadb.crm_Targets.findMany as jest.Mock).mockResolvedValue([
      { email: "optedout@acme.com" },
    ]);

    await importTargets(
      makeFormData("email,last_name\noptedout@acme.com,Doe\nfresh@acme.com,Roe")
    );

    const rows = (prismadb.crm_Targets.createMany as jest.Mock).mock.calls[0][0].data;
    const optedOut = rows.find((r: any) => r.email === "optedout@acme.com");
    const fresh = rows.find((r: any) => r.email === "fresh@acme.com");
    expect(optedOut.do_not_email).toBe(true);
    expect(optedOut.do_not_email_at).toEqual(expect.any(Date));
    expect(fresh.do_not_email).toBeUndefined();
  });

  it("skips the suppression lookup when no rows have emails", async () => {
    await importTargets(makeFormData("last_name\nDoe"));
    expect(prismadb.crm_Targets.findMany).not.toHaveBeenCalled();
  });
});
