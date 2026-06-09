import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/authz", () => ({
  requireRole: vi.fn(),
  requireAuthenticated: vi.fn(),
  assertCanReadActivityForEntity: vi.fn(),
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
    crm_AuditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { getAuditLogAdmin } from "@/actions/crm/audit-log/get-audit-log-admin";
import { getAuditLogByEntity } from "@/actions/crm/audit-log/get-audit-log-by-entity";
import {
  AuthenticationError,
  AuthorizationError,
  assertCanReadActivityForEntity,
  requireAuthenticated,
  requireRole,
} from "@/lib/authz";
import { prismadb } from "@/lib/prisma";

describe("getAuditLogAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns Unauthorized", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getAuditLogAdmin();
    expect(res).toEqual({ error: "Unauthorized" });
  });

  it("AuthorizationError returns Forbidden", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await getAuditLogAdmin();
    expect(res).toEqual({ error: "Forbidden" });
  });

  it("returns audit log with pagination", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
      role: "admin",
    });
    const entries = [{ id: "a1", entityType: "lead", action: "created", user: { name: "User" } }];
    (prismadb.crm_AuditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(entries);
    (prismadb.crm_AuditLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);

    const res = await getAuditLogAdmin();
    expect(res).toEqual({
      data: entries,
      total: 1,
      page: 1,
      totalPages: 1,
    });
  });

  it("applies filters correctly", async () => {
    (requireRole as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
      role: "admin",
    });
    (prismadb.crm_AuditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prismadb.crm_AuditLog.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await getAuditLogAdmin({
      entityType: "lead",
      action: "created",
      userId: "u1",
      dateFrom: new Date("2024-01-01"),
      dateTo: new Date("2024-12-31"),
      page: 2,
    });

    expect(prismadb.crm_AuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          entityType: "lead",
          action: "created",
          userId: "u1",
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
        take: 50,
        skip: 50,
      }),
    );
  });
});

describe("getAuditLogByEntity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AuthenticationError returns empty data", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthenticationError());
    const res = await getAuditLogByEntity("lead", "l1");
    expect(res).toEqual({ data: [], nextCursor: null });
  });

  it("AuthorizationError returns empty data", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });
    (assertCanReadActivityForEntity as ReturnType<typeof vi.fn>).mockRejectedValue(new AuthorizationError());
    const res = await getAuditLogByEntity("lead", "l1");
    expect(res).toEqual({ data: [], nextCursor: null });
  });

  it("returns entries without cursor", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });
    (assertCanReadActivityForEntity as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const entries = Array(25)
      .fill(null)
      .map((_, i) => ({ id: `a${i}`, entityType: "lead", entityId: "l1" }));
    (prismadb.crm_AuditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(entries);

    const res = await getAuditLogByEntity("lead", "l1");
    expect(res.data).toHaveLength(25);
    expect(res.nextCursor).toBeNull();
  });

  it("returns entries with cursor when more data", async () => {
    (requireAuthenticated as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
    });
    (assertCanReadActivityForEntity as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const entries = Array(26)
      .fill(null)
      .map((_, i) => ({ id: `a${i}`, entityType: "lead", entityId: "l1" }));
    (prismadb.crm_AuditLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(entries);

    const res = await getAuditLogByEntity("lead", "l1");
    expect(res.data).toHaveLength(25);
    expect(res.nextCursor).toBe("a24");
  });
});
