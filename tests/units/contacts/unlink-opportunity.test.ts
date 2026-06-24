import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: vi.fn() },
    contactsToOpportunities: { delete: vi.fn() },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { unlinkOpportunity } from "@/actions/crm/contacts/unlink-opportunity";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (getSession as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id } });
};

describe("unlinkOpportunity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("unauthenticated returns Unauthorized error", async () => {
    (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await unlinkOpportunity({
      contactId: "c1",
      opportunityId: "o1",
    });
    expect(res).toEqual({ error: "Unauthorized" });
    expect(prismadb.contactsToOpportunities.delete).not.toHaveBeenCalled();
  });

  it("returns error when contactId is missing", async () => {
    mockUser();
    const res = await unlinkOpportunity({ contactId: "", opportunityId: "o1" });
    expect(res).toEqual({ error: "contactId is required" });
  });

  it("returns error when opportunityId is missing", async () => {
    mockUser();
    const res = await unlinkOpportunity({ contactId: "c1", opportunityId: "" });
    expect(res).toEqual({ error: "opportunityId is required" });
  });

  it("deletes junction record with correct composite key", async () => {
    (prismadb.contactsToOpportunities.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const res = await unlinkOpportunity({
      contactId: "c1",
      opportunityId: "o1",
    });
    expect(res).toEqual({ success: true });
    expect(prismadb.contactsToOpportunities.delete).toHaveBeenCalledWith({
      where: {
        contact_id_opportunity_id: {
          contact_id: "c1",
          opportunity_id: "o1",
        },
      },
    });
  });

  it("revalidates contacts path on success", async () => {
    const { revalidatePath } = await import("next/cache");
    (prismadb.contactsToOpportunities.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});
    await unlinkOpportunity({ contactId: "c1", opportunityId: "o1" });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/(routes)/crm/contacts", "page");
  });

  it("returns error on prisma failure", async () => {
    (prismadb.contactsToOpportunities.delete as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));
    const res = await unlinkOpportunity({
      contactId: "c1",
      opportunityId: "o1",
    });
    expect(res).toEqual({ error: "Failed to unlink opportunity" });
  });
});
