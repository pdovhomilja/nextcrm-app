jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    users: { findUnique: jest.fn() },
    documents: { update: jest.fn(), findFirst: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue(undefined) },
}));

import { prismadb } from "@/lib/prisma";
import { getSession } from "@/lib/auth-server";
import { retryEnrichment } from "@/actions/documents/retry-enrichment";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id } });
  (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id, role });
};

describe("retryEnrichment auth", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401: unauthenticated throws and does not update", async () => {
    (getSession as jest.Mock).mockResolvedValue(null);
    await expect(retryEnrichment("d1")).rejects.toThrow("Unauthorized");
    expect(prismadb.documents.update).not.toHaveBeenCalled();
  });

  it("user out-of-scope: throws Forbidden", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue(null);
    await expect(retryEnrichment("d1")).rejects.toThrow("Forbidden");
    expect(prismadb.documents.update).not.toHaveBeenCalled();
  });

  it("user in-scope owner: triggers update", async () => {
    mockUser("user", "u1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.documents.update as jest.Mock).mockResolvedValue({});
    await retryEnrichment("d1");
    expect(prismadb.documents.update).toHaveBeenCalledWith({
      where: { id: "d1" },
      data: { processing_status: "PENDING", processing_error: null },
    });
  });

  it("manager: bypasses OR and updates", async () => {
    mockUser("manager", "m1");
    (prismadb.documents.findFirst as jest.Mock).mockResolvedValue({ id: "d1" });
    (prismadb.documents.update as jest.Mock).mockResolvedValue({});
    await retryEnrichment("d1");
    const where = (prismadb.documents.findFirst as jest.Mock).mock.calls[0][0].where;
    expect(where.OR).toBeUndefined();
  });
});
