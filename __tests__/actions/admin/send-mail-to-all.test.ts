jest.mock("@/lib/authz", () => {
  class AuthenticationError extends Error {}
  class AuthorizationError extends Error {}
  return { requireRole: jest.fn(), AuthenticationError, AuthorizationError };
});
jest.mock("@/lib/prisma", () => ({
  prismadb: { users: { findMany: jest.fn() } },
}));
const mockResendSend = jest.fn().mockResolvedValue({});
jest.mock("@/lib/resend", () => ({
  __esModule: true,
  default: jest.fn(async () => ({ emails: { send: mockResendSend } })),
  getResendApiKey: jest.fn(),
}));
jest.mock("@/lib/sendmail", () => ({ __esModule: true, default: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@react-email/render", () => ({ render: jest.fn().mockResolvedValue("<p>html</p>") }));
jest.mock("@/emails/admin/MessageToAllUser", () => ({ __esModule: true, default: jest.fn(() => null) }));

import { requireRole } from "@/lib/authz";
import { prismadb } from "@/lib/prisma";
import { getResendApiKey } from "@/lib/resend";
import sendEmail from "@/lib/sendmail";
import { sendMailToAll } from "@/actions/admin/send-mail-to-all";

const findMany = prismadb.users.findMany as jest.Mock;
const getKey = getResendApiKey as jest.Mock;
const smtp = sendEmail as unknown as jest.Mock;

const users = [
  { id: "1", name: "One", email: "one@example.com" },
  { id: "2", name: "Two", email: "two@example.com" },
];

beforeEach(() => {
  jest.clearAllMocks();
  (requireRole as jest.Mock).mockResolvedValue({ id: "a", role: "admin" });
  findMany.mockResolvedValue(users);
});

const input = { title: "Hello", message: "World message" };

describe("sendMailToAll", () => {
  it("only mails ACTIVE users", async () => {
    getKey.mockResolvedValue("re_key");
    await sendMailToAll(input);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userStatus: "ACTIVE" } })
    );
  });

  it("sends once per user via Resend when a Resend key is configured", async () => {
    getKey.mockResolvedValue("re_key");
    const res = await sendMailToAll(input);
    expect(res).toEqual({ data: input });
    expect(mockResendSend).toHaveBeenCalledTimes(2);
    expect(smtp).not.toHaveBeenCalled();
  });

  it("sends once per user via SMTP when no Resend key is configured", async () => {
    getKey.mockResolvedValue(null);
    const res = await sendMailToAll(input);
    expect(res).toEqual({ data: input });
    expect(smtp).toHaveBeenCalledTimes(2);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("sends nothing when the caller is not an admin", async () => {
    const { AuthorizationError } = jest.requireMock("@/lib/authz");
    (requireRole as jest.Mock).mockRejectedValue(new AuthorizationError());
    const res = await sendMailToAll(input);
    expect(res.error).toBeTruthy();
    expect(findMany).not.toHaveBeenCalled();
    expect(mockResendSend).not.toHaveBeenCalled();
    expect(smtp).not.toHaveBeenCalled();
  });
});
