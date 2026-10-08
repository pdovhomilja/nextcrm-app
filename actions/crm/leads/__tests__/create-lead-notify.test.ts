// Assignee notification on lead create: mail goes only to the assignee's own
// address; with no address nothing is sent (no vendor fallback).

jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Leads: { create: jest.fn().mockResolvedValue({ id: "l-1" }) },
    users: { findFirst: jest.fn() },
  },
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn() }));

import { requireAuthenticated } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import sendEmail from "@/lib/sendmail";
import { createLead } from "@/actions/crm/leads/create-lead";

const findUser = prismadb.users.findFirst as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  (requireAuthenticated as jest.Mock).mockResolvedValue({ id: "owner", role: "user" });
});

describe("createLead assignee notification", () => {
  it("mails the assignee's own address", async () => {
    findUser.mockResolvedValue({ email: "rep@example.com", userLanguage: "en" });
    await createLead({ last_name: "X", assigned_to: "rep" });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "rep@example.com" })
    );
  });

  it("sends nothing when the assignee has no address", async () => {
    findUser.mockResolvedValue({ email: "", userLanguage: "en" });
    await createLead({ last_name: "X", assigned_to: "rep" });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
