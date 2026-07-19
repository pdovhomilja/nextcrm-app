jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  requireRole: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: { crm_Accounts: { findFirst: jest.fn(), update: jest.fn() } },
}));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

import { prismadb } from "@/lib/prisma";
import { requireAuthenticated, requireRole } from "@/lib/authz";
import {
  setCaseStudyCandidate,
  setCaseStudyApproved,
} from "@/actions/crm/accounts/case-study";

describe("case-study flags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "rep1", role: "user" });
    (requireRole as jest.Mock).mockResolvedValue({ id: "cso1", role: "manager" });
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({
      id: "a1", name: "Acme", case_study_candidate: true, case_study_approved: false,
    });
    (prismadb.crm_Accounts.update as jest.Mock).mockResolvedValue({});
  });

  it("rep can flag a candidate", async () => {
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({
      id: "a1", case_study_candidate: false, case_study_approved: false,
    });
    const res = await setCaseStudyCandidate("a1", true);
    expect(res).toEqual({});
    const data = (prismadb.crm_Accounts.update as jest.Mock).mock.calls[0][0].data;
    expect(data.case_study_candidate).toBe(true);
  });

  it("unflagging a candidate also clears approval", async () => {
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({
      id: "a1", case_study_candidate: true, case_study_approved: true,
    });
    await setCaseStudyCandidate("a1", false);
    const data = (prismadb.crm_Accounts.update as jest.Mock).mock.calls[0][0].data;
    expect(data).toMatchObject({ case_study_candidate: false, case_study_approved: false });
  });

  it("manager approves a flagged candidate", async () => {
    const res = await setCaseStudyApproved("a1", true);
    expect(res).toEqual({});
    const data = (prismadb.crm_Accounts.update as jest.Mock).mock.calls[0][0].data;
    expect(data.case_study_approved).toBe(true);
  });

  it("cannot approve an account that is not a candidate", async () => {
    (prismadb.crm_Accounts.findFirst as jest.Mock).mockResolvedValue({
      id: "a1", case_study_candidate: false, case_study_approved: false,
    });
    const res = await setCaseStudyApproved("a1", true);
    expect(res.error).toBeDefined();
    expect(prismadb.crm_Accounts.update).not.toHaveBeenCalled();
  });

  it("approval requires manager/admin", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    (requireRole as jest.Mock).mockRejectedValue(new AuthorizationError());
    const res = await setCaseStudyApproved("a1", true);
    expect(res.error).toBeDefined();
  });
});
