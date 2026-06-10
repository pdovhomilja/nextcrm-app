import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireAuthenticated: vi.fn(),
  assertCanReadAccount: vi.fn(),
  assertCanReadContact: vi.fn(),
  assertCanReadLead: vi.fn(),
  assertCanReadOpportunity: vi.fn(),
  filterAuthorizedAccountIds: vi.fn(),
  filterAuthorizedContactIds: vi.fn(),
  filterAuthorizedLeadIds: vi.fn(),
  filterAuthorizedOpportunityIds: vi.fn(),
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
    $queryRaw: vi.fn(),
  },
}));

import { getSimilarAccounts } from "@/actions/crm/similarity/get-similar-accounts";
import { getSimilarContacts } from "@/actions/crm/similarity/get-similar-contacts";
import { getSimilarLeads } from "@/actions/crm/similarity/get-similar-leads";
import { getSimilarOpportunities } from "@/actions/crm/similarity/get-similar-opportunities";
import {
  AuthenticationError,
  AuthorizationError,
  assertCanReadAccount,
  assertCanReadContact,
  assertCanReadLead,
  assertCanReadOpportunity,
  filterAuthorizedAccountIds,
  filterAuthorizedContactIds,
  filterAuthorizedLeadIds,
  filterAuthorizedOpportunityIds,
  requireAuthenticated,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

const mockUser = (id = "u1") => {
  (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
    id,
  });
};

describe("getSimilarAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
    (filterAuthorizedAccountIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("AuthenticationError returns empty records", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getSimilarAccounts("a1");
    expect(res).toEqual({ status: "ok", records: [] });
  });

  it("AuthorizationError returns empty records", async () => {
    (assertCanReadAccount as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await getSimilarAccounts("a1");
    expect(res).toEqual({ status: "ok", records: [] });
  });

  it("returns no_embedding when no embedding found", async () => {
    (assertCanReadAccount as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (prismadb.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const res = await getSimilarAccounts("a1");
    expect(res).toEqual({ status: "no_embedding" });
  });

  it("returns similar accounts successfully", async () => {
    (assertCanReadAccount as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (prismadb.$queryRaw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ embedding: "[0.1,0.2]" }])
      .mockResolvedValueOnce([{ id: "a2", name: "Acme", email: "a@acme.com", similarity: 0.95 }]);
    (filterAuthorizedAccountIds as ReturnType<typeof vi.fn>).mockResolvedValue(["a2"]);

    const res = await getSimilarAccounts("a1");
    expect(res).toEqual({
      status: "ok",
      records: [
        {
          id: "a2",
          name: "Acme",
          subtitle: "a@acme.com",
          similarity: 0.95,
          href: "/crm/accounts/a2",
        },
      ],
    });
  });
});

describe("getSimilarContacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
    (filterAuthorizedContactIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("returns no_embedding when no embedding found", async () => {
    (assertCanReadContact as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (prismadb.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
    const res = await getSimilarContacts("c1");
    expect(res).toEqual({ status: "no_embedding" });
  });

  it("returns similar contacts successfully", async () => {
    (assertCanReadContact as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (prismadb.$queryRaw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ embedding: "[0.1,0.2]" }])
      .mockResolvedValueOnce([
        {
          id: "c2",
          first_name: "John",
          last_name: "Doe",
          position: "CEO",
          similarity: 0.9,
        },
      ]);
    (filterAuthorizedContactIds as ReturnType<typeof vi.fn>).mockResolvedValue(["c2"]);

    const res = await getSimilarContacts("c1");
    expect((res as any).records[0].name).toBe("John Doe");
  });
});

describe("getSimilarLeads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
    (filterAuthorizedLeadIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("returns similar leads successfully", async () => {
    (assertCanReadLead as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (prismadb.$queryRaw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ embedding: "[0.1,0.2]" }])
      .mockResolvedValueOnce([
        {
          id: "l2",
          firstName: "Jane",
          lastName: "Smith",
          status: "New",
          similarity: 0.85,
        },
      ]);
    (filterAuthorizedLeadIds as ReturnType<typeof vi.fn>).mockResolvedValue(["l2"]);

    const res = await getSimilarLeads("l1");
    expect((res as any).records[0].name).toBe("Jane Smith");
  });
});

describe("getSimilarOpportunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
    (filterAuthorizedOpportunityIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  it("returns similar opportunities successfully", async () => {
    (assertCanReadOpportunity as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (prismadb.$queryRaw as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([{ embedding: "[0.1,0.2]" }])
      .mockResolvedValueOnce([
        {
          id: "o2",
          name: "Big Deal",
          stage_name: "Prospecting",
          similarity: 0.88,
        },
      ]);
    (filterAuthorizedOpportunityIds as ReturnType<typeof vi.fn>).mockResolvedValue(["o2"]);

    const res = await getSimilarOpportunities("o1");
    expect((res as any).records[0].name).toBe("Big Deal");
  });
});
