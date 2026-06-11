import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  assertCanReadContact: vi.fn(),
  AuthenticationError: class extends Error {
    readonly code = "UNAUTHENTICATED";
    constructor(message = "Unauthenticated") {
      super(message);
      this.name = "AuthenticationError";
    }
  },
  AuthorizationError: class extends Error {
    readonly code = "FORBIDDEN";
    constructor(message = "Forbidden") {
      super(message);
      this.name = "AuthorizationError";
    }
  },
}));

vi.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Contacts: {
      findFirst: vi.fn(),
    },
  },
}));

import { getContact } from "@/actions/crm/get-contact";
import { AuthenticationError, AuthorizationError, assertCanReadContact, requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (role: "user" | "manager" | "admin", id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
    role,
  });
};

describe("getContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (assertCanReadContact as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("AuthenticationError returns null", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getContact("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_Contacts.findFirst).not.toHaveBeenCalled();
  });

  it("AuthorizationError returns null", async () => {
    mockUser("user");
    (assertCanReadContact as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await getContact("c1");
    expect(res).toBeNull();
    expect(prismadb.crm_Contacts.findFirst).not.toHaveBeenCalled();
  });

  it("non-auth error from requireAuthenticated is thrown", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected"));
    await expect(getContact("c1")).rejects.toThrow("Unexpected");
  });

  it("non-authz error from assertCanReadContact is thrown", async () => {
    mockUser("user");
    (assertCanReadContact as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unexpected"));
    await expect(getContact("c1")).rejects.toThrow("Unexpected");
  });

  it("finds contact by id with correct include shape", async () => {
    mockUser("user");
    const mockContact = {
      id: "c1",
      first_name: "John",
      last_name: "Doe",
      opportunities: [],
      documents: [],
      contact_type: { id: "t1", name: "Customer" },
      assigned_accounts: [],
      assigned_to_user: { id: "u1", name: "User", email: "u@t.com" },
      crate_by_user: { id: "u2", name: "Admin", email: "a@t.com" },
    };
    (prismadb.crm_Contacts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockContact);

    const res = await getContact("c1");
    expect(res).toEqual(mockContact);
    expect(prismadb.crm_Contacts.findFirst).toHaveBeenCalledWith({
      where: { id: "c1", deletedAt: null },
      include: {
        opportunities: {
          include: {
            opportunity: {
              select: {
                id: true,
                name: true,
                sales_stage: true,
                close_date: true,
                budget: true,
              },
            },
          },
        },
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
        contact_type: { select: { id: true, name: true } },
        assigned_accounts: true,
        assigned_to_user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        crate_by_user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  });

  it("returns null when contact not found", async () => {
    mockUser("user");
    (prismadb.crm_Contacts.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getContact("c1");
    expect(res).toBeNull();
  });
});
