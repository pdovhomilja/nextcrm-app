jest.mock("@/lib/prisma", () => ({
  prismadb: {
    verification: {
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth-otp-mail", () => ({
  OTP_EXPIRES_SECONDS: 600,
  sendOtpEmail: jest.fn(),
}));

import { sendOtpEmail } from "@/lib/auth-otp-mail";
import { prismadb } from "@/lib/prisma";
import { issueSignInOtp } from "@/lib/auth-otp-issue";

const findFirst = prismadb.verification.findFirst as jest.Mock;
const update = prismadb.verification.update as jest.Mock;
const deleteMany = prismadb.verification.deleteMany as jest.Mock;
const create = prismadb.verification.create as jest.Mock;
const send = sendOtpEmail as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  send.mockResolvedValue(undefined);
  update.mockResolvedValue({});
  deleteMany.mockResolvedValue({ count: 0 });
  create.mockResolvedValue({});
});

describe("issueSignInOtp", () => {
  it("stores a code only after the email send succeeds", async () => {
    findFirst.mockResolvedValue(null);

    const result = await issueSignInOtp("Person@Gmail.com");

    expect(result).toEqual({ ok: true, retryAfterSeconds: 30 });
    expect(send).toHaveBeenCalledWith("person@gmail.com", expect.stringMatching(/^\d{6}$/));
    expect(send.mock.invocationCallOrder[0]).toBeLessThan(create.mock.invocationCallOrder[0]);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        identifier: "sign-in-otp-person@gmail.com",
        value: expect.stringMatching(/^\d{6}:0$/),
      }),
    });
  });

  it("does not replace the stored code when sending fails", async () => {
    findFirst.mockResolvedValue(null);
    send.mockRejectedValue(new Error("The domain is not verified."));

    const result = await issueSignInOtp("person@gmail.com");

    expect(result).toEqual({ error: "The domain is not verified." });
    expect(create).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it("resends the same unexpired code instead of rotating it", async () => {
    const sentAt = new Date(Date.now() - 60_000);
    findFirst.mockResolvedValue({
      id: "row-1",
      identifier: "sign-in-otp-person@gmail.com",
      value: "654321:1",
      expiresAt: new Date(Date.now() + 5 * 60_000),
      createdAt: sentAt,
      updatedAt: sentAt,
    });

    const result = await issueSignInOtp("person@gmail.com");

    expect(result).toEqual({ ok: true, retryAfterSeconds: 30 });
    expect(send).toHaveBeenCalledWith("person@gmail.com", "654321");
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: "row-1" },
      data: expect.objectContaining({ expiresAt: expect.any(Date) }),
    });
  });

  it("refuses a resend during the cooldown and does not send again", async () => {
    const sentAt = new Date();
    findFirst.mockResolvedValue({
      id: "row-1",
      identifier: "sign-in-otp-person@gmail.com",
      value: "654321:0",
      expiresAt: new Date(Date.now() + 5 * 60_000),
      createdAt: sentAt,
      updatedAt: sentAt,
    });

    const result = await issueSignInOtp("person@gmail.com");

    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/Wait \d+s/),
      })
    );
    expect(send).not.toHaveBeenCalled();
  });
});
