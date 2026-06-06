import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    $transaction: vi.fn(async (callback) => {
      const tx = {
        crm_Activities: {
          create: vi.fn().mockResolvedValue({ id: "act1" }),
        },
        crm_ActivityLinks: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      };
      return callback(tx);
    }),
    crm_Activities: {
      findUnique: vi.fn(),
    },
    crm_ActivityLinks: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createActivity } from "@/actions/crm/activities/create-activity";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("createActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await createActivity({
      type: "call",
      title: "Call",
      date: new Date(),
      status: "scheduled",
      links: [],
    });
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("creates activity without links", async () => {
    const mockActivity = {
      id: "act1",
      type: "call",
      title: "Call",
      createdBy: "u1",
    };
    (prismadb.crm_Activities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity);

    const res = await createActivity({
      type: "call",
      title: "Call",
      date: new Date("2024-01-01"),
      status: "scheduled",
      links: [],
    });

    expect(res).toEqual({ data: mockActivity });
  });

  it("creates activity with links", async () => {
    const mockActivity = { id: "act1", title: "Call" };
    (prismadb.crm_Activities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity);

    const date = new Date("2024-01-01");
    const res = await createActivity({
      type: "call",
      title: "Call",
      description: "Desc",
      date,
      duration: 30,
      outcome: "success",
      status: "completed",
      metadata: { key: "value" },
      links: [
        { entityType: "account", entityId: "a1" },
        { entityType: "contact", entityId: "c1" },
      ],
    });

    expect(res).toEqual({ data: mockActivity });
  });

  it("revalidates paths for all links", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Activities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "act1" });

    await createActivity({
      type: "meeting",
      title: "Meeting",
      date: new Date(),
      status: "scheduled",
      links: [
        { entityType: "account", entityId: "a1" },
        { entityType: "contact", entityId: "c1" },
        { entityType: "lead", entityId: "l1" },
        { entityType: "opportunity", entityId: "o1" },
        { entityType: "contract", entityId: "c1" },
        { entityType: "custom", entityId: "x1" },
      ],
    });

    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/accounts/a1", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/contacts/c1", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/leads/l1", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/opportunities/o1", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/contracts/c1", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/customs/x1", "page");
  });

  it("does not revalidate when no links", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.crm_Activities.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "act1" });

    await createActivity({
      type: "note",
      title: "Note",
      date: new Date(),
      status: "completed",
      links: [],
    });

    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns error on prisma failure", async () => {
    (prismadb.crm_Activities.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const res = await createActivity({
      type: "call",
      title: "Call",
      date: new Date(),
      status: "scheduled",
      links: [],
    });

    expect(res).toEqual({ error: "Failed to create activity" });
  });
});
