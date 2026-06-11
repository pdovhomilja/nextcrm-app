import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_ActivityLinks: {
      findMany: vi.fn(),
    },
    crm_Activities: {
      update: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { deleteActivity } from "@/actions/crm/activities/delete-activity";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("deleteActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await deleteActivity("act1");
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.crm_ActivityLinks.findMany).not.toHaveBeenCalled();
  });

  it("soft deletes activity with correct data", async () => {
    (prismadb.crm_ActivityLinks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_Activities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "act1" });

    const res = await deleteActivity("act1");
    expect(res).toEqual({ success: true });
    expect(prismadb.crm_Activities.update).toHaveBeenCalledWith({
      where: { id: "act1" },
      data: { deletedAt: expect.any(Date), deletedBy: "u1" },
    });
  });

  it("fetches links before delete for revalidation", async () => {
    (prismadb.crm_ActivityLinks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { entityType: "account", entityId: "a1" },
      { entityType: "contact", entityId: "c1" },
    ]);
    (prismadb.crm_Activities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "act1" });

    await deleteActivity("act1");
    expect(prismadb.crm_ActivityLinks.findMany).toHaveBeenCalledWith({
      where: { activityId: "act1" },
    });
  });

  it("revalidates paths for all captured links", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_ActivityLinks.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { entityType: "account", entityId: "a1" },
      { entityType: "lead", entityId: "l1" },
      { entityType: "custom", entityId: "x1" },
    ]);
    (prismadb.crm_Activities.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "act1" });

    await deleteActivity("act1");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/accounts/a1", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/leads/l1", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/customs/x1", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_ActivityLinks.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const res = await deleteActivity("act1");
    expect(res).toEqual({ error: "Failed to delete activity" });
  });
});
