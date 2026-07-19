jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Opportunities: { findFirst: jest.fn(), update: jest.fn() },
    users: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
const mockEmailSend = jest.fn().mockResolvedValue({});
jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(async () => ({ emails: { send: mockEmailSend } })),
}));

import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, requireRole } from "@/lib/authz";
import { requestApproval, decideApproval } from "@/actions/crm/opportunities/approval";

describe("requestApproval", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "rep1", role: "user" });
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", name: "Deal", approval_status: "NONE", assigned_to: "rep1",
    });
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({ id: "o1" });
    (prismadb.users.findMany as jest.Mock).mockResolvedValue([
      { email: "cso@x.cz" },
    ]);
  });

  it("moves NONE -> PENDING, stamps requested_at, notifies approvers", async () => {
    const res = await requestApproval("o1");
    expect(res).toEqual({});
    const call = (prismadb.crm_Opportunities.update as jest.Mock).mock.calls[0][0];
    expect(call.where).toEqual({ id: "o1" });
    expect(call.data.approval_status).toBe("PENDING");
    expect(call.data.approval_requested_at).toEqual(expect.any(Date));
    expect(call.data.approval_note).toBeNull();
    expect(mockEmailSend).toHaveBeenCalled();
  });

  it("rejects when already PENDING", async () => {
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", approval_status: "PENDING",
    });
    const res = await requestApproval("o1");
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("rejects when already APPROVED", async () => {
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", approval_status: "APPROVED",
    });
    const res = await requestApproval("o1");
    expect(res.error).toBeDefined();
  });

  it("allows re-request after REJECTED", async () => {
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", approval_status: "REJECTED", assigned_to: "rep1",
    });
    const res = await requestApproval("o1");
    expect(res).toEqual({});
  });
});

describe("decideApproval", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireRole as jest.Mock).mockResolvedValue({ id: "cso1", role: "manager" });
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", name: "Deal", approval_status: "PENDING", assigned_to: "rep1",
    });
    (prismadb.crm_Opportunities.update as jest.Mock).mockResolvedValue({ id: "o1" });
    (prismadb.users.findUnique as jest.Mock).mockResolvedValue({ id: "rep1", email: "rep@x.cz" });
  });

  it("approves: sets status/by/at and notifies the rep", async () => {
    const res = await decideApproval("o1", "APPROVED");
    expect(res).toEqual({});
    const data = (prismadb.crm_Opportunities.update as jest.Mock).mock.calls[0][0].data;
    expect(data.approval_status).toBe("APPROVED");
    expect(data.approved_by).toBe("cso1");
    expect(data.approved_at).toEqual(expect.any(Date));
    expect(mockEmailSend).toHaveBeenCalled();
  });

  it("rejects with a note", async () => {
    await decideApproval("o1", "REJECTED", "  Missing pricing table  ");
    const data = (prismadb.crm_Opportunities.update as jest.Mock).mock.calls[0][0].data;
    expect(data.approval_status).toBe("REJECTED");
    expect(data.approval_note).toBe("Missing pricing table");
  });

  it("errors when the deal is not PENDING", async () => {
    (prismadb.crm_Opportunities.findFirst as jest.Mock).mockResolvedValue({
      id: "o1", approval_status: "NONE",
    });
    const res = await decideApproval("o1", "APPROVED");
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Opportunities.update).not.toHaveBeenCalled();
  });

  it("returns error for non-managers", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    (requireRole as jest.Mock).mockRejectedValue(new AuthorizationError());
    const res = await decideApproval("o1", "APPROVED");
    expect(res.error).toBeDefined();
  });
});
