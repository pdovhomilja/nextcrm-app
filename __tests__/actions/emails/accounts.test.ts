jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    emailAccount: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: "acc-1", label: "Work" }),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: "acc-1", isActive: false }),
      delete: jest.fn().mockResolvedValue({}),
    },
  },
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/email-crypto", () => ({
  encrypt: jest.fn().mockReturnValue("encrypted-password"),
  decrypt: jest.fn().mockReturnValue("plaintext"),
}));

import { getServerSession } from "next-auth";
import {
  getEmailAccounts,
  createEmailAccount,
  deleteEmailAccount,
  setEmailAccountActive,
  testEmailConnection,
} from "@/actions/emails/accounts";
import { prismadb } from "@/lib/prisma";
import { encrypt } from "@/lib/email-crypto";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFindFirst = prismadb.emailAccount.findFirst as jest.MockedFunction<typeof prismadb.emailAccount.findFirst>;

const AUTHED_SESSION = { user: { id: "user-123" } } as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getEmailAccounts", () => {
  it("throws Unauthorized when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(getEmailAccounts()).rejects.toThrow("Unauthorized");
  });

  it("returns accounts for authenticated user", async () => {
    mockGetServerSession.mockResolvedValue(AUTHED_SESSION);
    const result = await getEmailAccounts();
    expect(prismadb.emailAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-123" } })
    );
    expect(result).toEqual([]);
  });
});

describe("createEmailAccount", () => {
  const input = {
    label: "Work Gmail",
    imapHost: "imap.gmail.com",
    imapPort: 993,
    imapSsl: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: 465,
    smtpSsl: true,
    username: "user@gmail.com",
    password: "secret",
  };

  it("throws Unauthorized when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(createEmailAccount(input)).rejects.toThrow("Unauthorized");
  });

  it("encrypts password and saves account for authenticated user", async () => {
    mockGetServerSession.mockResolvedValue(AUTHED_SESSION);
    await createEmailAccount(input);
    expect(encrypt).toHaveBeenCalledWith("secret");
    expect(prismadb.emailAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          passwordEncrypted: "encrypted-password",
          label: "Work Gmail",
        }),
      })
    );
  });

  it("throws when required fields are empty", async () => {
    mockGetServerSession.mockResolvedValue(AUTHED_SESSION);
    await expect(
      createEmailAccount({ ...input, imapHost: "" })
    ).rejects.toThrow();
  });
});

describe("deleteEmailAccount", () => {
  it("throws Unauthorized when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(deleteEmailAccount("acc-1")).rejects.toThrow("Unauthorized");
  });

  it("throws Not found when account does not belong to user", async () => {
    mockGetServerSession.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(null);
    await expect(deleteEmailAccount("other-acc")).rejects.toThrow("Not found");
  });

  it("deletes account when ownership verified", async () => {
    mockGetServerSession.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue({ id: "acc-1" } as any);
    await deleteEmailAccount("acc-1");
    expect(prismadb.emailAccount.delete).toHaveBeenCalledWith({ where: { id: "acc-1" } });
  });
});

describe("setEmailAccountActive", () => {
  it("throws Unauthorized when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(setEmailAccountActive("acc-1", false)).rejects.toThrow("Unauthorized");
  });

  it("throws Not found when account does not belong to user", async () => {
    mockGetServerSession.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue(null);
    await expect(setEmailAccountActive("acc-1", false)).rejects.toThrow("Not found");
  });

  it("updates isActive when ownership verified", async () => {
    mockGetServerSession.mockResolvedValue(AUTHED_SESSION);
    mockFindFirst.mockResolvedValue({ id: "acc-1" } as any);
    await setEmailAccountActive("acc-1", false);
    expect(prismadb.emailAccount.update).toHaveBeenCalledWith({
      where: { id: "acc-1" },
      data: { isActive: false },
    });
  });
});

describe("testEmailConnection", () => {
  it("throws Unauthorized when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(
      testEmailConnection({ imapHost: "imap.example.com", imapPort: 993, imapSsl: true, username: "u", password: "p" })
    ).rejects.toThrow("Unauthorized");
  });
});
