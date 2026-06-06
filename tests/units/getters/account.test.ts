import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      findFirst: vi.fn(),
    },
  },
}));

import { getAccount } from "@/actions/crm/get-account";
import { prismadb } from "@/lib/prisma";

describe("getAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds account by id with correct include shape", async () => {
    const mockAccount = {
      id: "a1",
      name: "Acme",
      contacts: [],
      opportunities: [],
      documents: [],
      assigned_to_user: { name: "User" },
      watchers: [],
    };
    (prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccount);

    const res = await getAccount("a1");
    expect(res).toEqual(mockAccount);
    expect(prismadb.crm_Accounts.findFirst).toHaveBeenCalledWith({
      where: { id: "a1", deletedAt: null },
      include: {
        contacts: true,
        opportunities: true,
        documents: {
          include: {
            document: {
              select: {
                id: true,
                document_name: true,
                document_type: true,
                document_file_url: true,
                document_file_mimeType: true,
                createdAt: true,
                created_by: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        assigned_to_user: {
          select: {
            name: true,
          },
        },
        watchers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  });

  it("returns null when account not found", async () => {
    (prismadb.crm_Accounts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getAccount("a1");
    expect(res).toBeNull();
  });
});
