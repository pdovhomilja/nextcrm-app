import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Targets: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      createMany: vi.fn(),
    },
    crm_Accounts: {
      create: vi.fn(),
    },
    crm_Contacts: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => {
      const tx = {
        crm_Accounts: { create: vi.fn().mockResolvedValue({ id: "a1" }) },
        crm_Contacts: { create: vi.fn().mockResolvedValue({ id: "c1" }) },
        crm_Targets: { update: vi.fn().mockResolvedValue({}) },
      };
      return callback(tx);
    }),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("papaparse", () => ({
  default: {
    parse: vi.fn((text: string, _options: unknown) => {
      const rows = text.trim().split("\n").slice(1);
      const headers = text.trim().split("\n")[0].split(",");
      const data = rows.map((row: string) => {
        const values = row.split(",");
        const obj: Record<string, string> = {};
        headers.forEach((h: string, i: number) => (obj[h.trim()] = values[i]?.trim() || ""));
        return obj;
      });
      return { data };
    }),
  },
}));

vi.mock("@/lib/openai", () => ({
  openAiHelper: vi.fn().mockResolvedValue(null),
}));

import { convertTarget } from "@/actions/crm/targets/convert-target";
import { createTarget } from "@/actions/crm/targets/create-target";
import { deleteTarget } from "@/actions/crm/targets/delete-target";
import { importTargets } from "@/actions/crm/targets/import-targets";
import { suggestMapping } from "@/actions/crm/targets/suggest-mapping";
import { updateTarget } from "@/actions/crm/targets/update-target";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("createTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createTarget({ last_name: "Doe" });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing last_name and company returns error", async () => {
    const res = await createTarget({});
    expect(res).toEqual({ error: "last_name or company is required" });
  });

  it("creates target with last_name", async () => {
    (prismadb.crm_Targets.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1", last_name: "Doe" });
    const res = await createTarget({ last_name: "Doe", email: "doe@t.com" });
    expect(res).toEqual({ data: { id: "t1", last_name: "Doe" } });
  });

  it("creates target with company", async () => {
    (prismadb.crm_Targets.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1", company: "Acme" });
    const res = await createTarget({ company: "Acme" });
    expect(res).toEqual({ data: { id: "t1", company: "Acme" } });
  });
});

describe("deleteTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await deleteTarget("t1");
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing targetId returns error", async () => {
    const res = await deleteTarget("");
    expect(res).toEqual({ error: "targetId is required" });
  });

  it("soft deletes target", async () => {
    (prismadb.crm_Targets.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1" });
    const res = await deleteTarget("t1");
    expect(res).toEqual({ success: true });
  });
});

describe("updateTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateTarget({ id: "t1", last_name: "Updated" });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("missing id returns error", async () => {
    const res = await updateTarget({ id: "" });
    expect(res).toEqual({ error: "id is required" });
  });

  it("updates target successfully", async () => {
    (prismadb.crm_Targets.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "t1", last_name: "Updated" });
    const res = await updateTarget({ id: "t1", last_name: "Updated" });
    expect(res).toEqual({ data: { id: "t1", last_name: "Updated" } });
  });
});

describe("convertTarget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await convertTarget("t1");
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("returns error when target not found", async () => {
    (prismadb.crm_Targets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await convertTarget("t1");
    expect(res).toEqual({ error: "Target not found" });
  });

  it("returns error when no company or last_name", async () => {
    (prismadb.crm_Targets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "t1",
      company: null,
      last_name: null,
    });
    const res = await convertTarget("t1");
    expect(res).toEqual({
      error: "Target needs a company name or last name to convert",
    });
  });

  it("returns existing conversion when already converted", async () => {
    (prismadb.crm_Targets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "t1",
      company: "Acme",
      converted_at: new Date(),
      converted_account_id: "a1",
      converted_contact_id: "c1",
    });
    const res = await convertTarget("t1");
    expect(res).toEqual({ accountId: "a1", contactId: "c1" });
  });

  it("converts target successfully", async () => {
    (prismadb.crm_Targets.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "t1",
      company: "Acme",
      last_name: "Doe",
      converted_at: null,
      converted_account_id: null,
      converted_contact_id: null,
    });
    const res = await convertTarget("t1");
    expect(res).toHaveProperty("accountId");
    expect(res).toHaveProperty("contactId");
  });
});

describe("importTargets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated throws error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(importTargets(new FormData())).rejects.toThrow("Unauthorized");
  });

  it("throws error when no file", async () => {
    await expect(importTargets(new FormData())).rejects.toThrow("No file provided");
  });

  it("imports valid targets", async () => {
    (prismadb.crm_Targets.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    const csv = "last_name,email\nDoe,doe@test.com";
    const file = new File([csv], "targets.csv", { type: "text/csv" });
    const form = new FormData();
    form.append("file", file);

    const res = await importTargets(form);
    expect(res.imported).toBe(1);
    expect(res.errors).toEqual([]);
  });

  it("reports missing last_name and company", async () => {
    const csv = "last_name,email\n,email@test.com";
    const file = new File([csv], "targets.csv", { type: "text/csv" });
    const form = new FormData();
    form.append("file", file);

    const res = await importTargets(form);
    expect(res.imported).toBe(0);
    expect(res.errors[0]).toContain("missing last_name or company");
  });
});

describe("suggestMapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await suggestMapping(["name", "email"]);
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("invalid headers returns error", async () => {
    const res = await suggestMapping("invalid" as any);
    expect(res).toEqual({ error: "Invalid request" });
  });

  it("returns fuzzy mapping for known headers", async () => {
    const res = await suggestMapping(["email", "phone", "company", "name"]);
    expect(res).toHaveProperty("mapping");
    expect((res as any).mapping.email).toBe("email");
    expect((res as any).mapping.phone).toBe("mobile_phone");
    expect((res as any).mapping.company).toBe("company");
    expect((res as any).mapping.name).toBe("first_name");
  });

  it("returns null for unknown headers", async () => {
    const res = await suggestMapping(["unknown_field_xyz"]);
    expect((res as any).mapping.unknown_field_xyz).toBeNull();
  });
});
