import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    $transaction: vi.fn(async (callback) => {
      const tx = {
        crm_Activities: {
          update: vi.fn().mockResolvedValue({ id: "act1" }),
        },
        crm_ActivityLinks: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };
      return callback(tx);
    }),
    crm_ActivityLinks: {
      findMany: vi.fn(),
    },
    crm_Activities: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { updateActivity } from "@/actions/crm/activities/update-activity";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("updateActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await updateActivity({
      id: "act1",
      title: "Updated",
      status: "completed",
    });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("updates activity without changing links", async () => {
    (prismadb.crm_ActivityLinks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const mockActivity = { id: "act1", title: "Updated" };
    (prismadb.crm_Activities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity);

    const res = await updateActivity({
      id: "act1",
      title: "Updated",
      status: "completed",
    });

    expect(res).toEqual({ data: mockActivity });
  });

  it("replaces links when links provided", async () => {
    (prismadb.crm_ActivityLinks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { entityType: "account", entityId: "old1" },
    ]);
    (prismadb.crm_Activities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "act1" });

    await updateActivity({
      id: "act1",
      links: [
        { entityType: "contact", entityId: "c1" },
        { entityType: "lead", entityId: "l1" },
      ],
    });
  });

  it("revalidates old and new links without duplicates", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_ActivityLinks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { entityType: "account", entityId: "a1" },
      { entityType: "contact", entityId: "c1" },
    ]);
    (prismadb.crm_Activities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "act1" });

    await updateActivity({
      id: "act1",
      links: [
        { entityType: "contact", entityId: "c1" },
        { entityType: "lead", entityId: "l1" },
      ],
    });

    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/accounts/a1", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/contacts/c1", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/leads/l1", "page");
  });

  it("does not revalidate duplicate links", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_ActivityLinks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { entityType: "account", entityId: "a1" },
    ]);
    (prismadb.crm_Activities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "act1" });

    await updateActivity({
      id: "act1",
      links: [{ entityType: "account", entityId: "a1" }],
    });

    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_ActivityLinks.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const res = await updateActivity({
      id: "act1",
      title: "Updated",
    });
    expect(res).toEqual({ error: "Failed to update activity" });
  });
});
