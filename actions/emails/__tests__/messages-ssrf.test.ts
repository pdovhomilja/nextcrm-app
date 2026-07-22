// SSRF host-guard regression tests for sendEmail (SMTP sink).
const createTransport = jest.fn((_opts: any) => ({ sendMail: jest.fn().mockResolvedValue({ messageId: "m1" }) }));
jest.mock("nodemailer", () => ({ __esModule: true, default: { createTransport } }));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    emailAccount: { findFirst: jest.fn() },
    email: { create: jest.fn().mockResolvedValue({}) },
  },
}));
jest.mock("@/lib/email-crypto", () => ({ decrypt: jest.fn(() => "pw") }));
jest.mock("@/lib/net/host-guard", () => ({
  assertPublicHost: jest.fn(),
  HostNotAllowedError: class HostNotAllowedError extends Error {},
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { assertPublicHost, HostNotAllowedError } from "@/lib/net/host-guard";
import { sendEmail } from "@/actions/emails/messages";

const getSess = getSession as jest.Mock;
const guard = assertPublicHost as jest.Mock;
const findAcc = prismadb.emailAccount.findFirst as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  getSess.mockResolvedValue({ user: { id: "u1" } });
});

it("a blocked stored SMTP host is not dialled", async () => {
  findAcc.mockResolvedValue({
    id: "a1", userId: "u1", smtpHost: "127.0.0.1", smtpPort: 465, smtpSsl: true,
    username: "u", passwordEncrypted: "enc",
  });
  guard.mockRejectedValue(new HostNotAllowedError());
  await expect(
    sendEmail({ accountId: "a1", to: ["x@y.z"], subject: "s", body: "b" } as any)
  ).rejects.toThrow();
  expect(createTransport).not.toHaveBeenCalled();
});

it("an allowed host dials the PINNED IP with servername=hostname", async () => {
  findAcc.mockResolvedValue({
    id: "a1", userId: "u1", smtpHost: "smtp.example.com", smtpPort: 465, smtpSsl: true,
    username: "u", passwordEncrypted: "enc",
  });
  guard.mockResolvedValue({ address: "93.184.216.34", hostname: "smtp.example.com" });
  await sendEmail({ accountId: "a1", to: ["x@y.z"], subject: "s", body: "b" } as any);
  const cfg = createTransport.mock.calls[0][0];
  expect(cfg.host).toBe("93.184.216.34");
  expect(cfg.servername).toBe("smtp.example.com");
});
