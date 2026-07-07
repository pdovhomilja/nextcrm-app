import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/create-safe-action", () => ({
  createSafeAction: vi.fn((_schema, handler) => {
    return (data: any) => handler(data);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { importTargets } from "@/actions/crm/targets/import-targets";
import { getSession } from "@/lib/auth-server";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("importTargets unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("rejects import with unsupported file format (.xlsx)", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["corrupt or binary data"], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      "targets.xlsx",
    );
    formData.append("mapping", JSON.stringify({}));

    // Expect an error / exception or returned error
    await expect(importTargets(formData)).rejects.toThrow();
  });

  it("rejects import with empty mapping", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["name,company\nJohn,Acme"], { type: "text/csv" }), "targets.csv");
    formData.append("mapping", JSON.stringify({})); // Empty mapping

    const result = await importTargets(formData);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("skips importing rows where both name and company are empty", async () => {
    const csvContent = "last_name,company,first_name\n,,John\n,,Jane\n";
    const formData = new FormData();
    formData.append("file", new Blob([csvContent], { type: "text/csv" }), "targets.csv");
    formData.append(
      "mapping",
      JSON.stringify({ last_name: "last_name", company: "company", first_name: "first_name" }),
    );

    const result = await importTargets(formData);
    expect(result.skipped).toBe(2);
    expect(result.errors.length).toBe(2);
  });
});
