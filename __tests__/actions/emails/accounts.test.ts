jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    emailAccount: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/email-crypto", () => ({
  encrypt: jest.fn().mockReturnValue("encrypted"),
  decrypt: jest.fn().mockReturnValue("plaintext"),
}));

import { getServerSession } from "next-auth";
import { getEmailAccounts, deleteEmailAccount } from "@/actions/emails/accounts";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe("account actions — auth guard", () => {
  it("getEmailAccounts throws when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(getEmailAccounts()).rejects.toThrow("Unauthorized");
  });

  it("deleteEmailAccount throws when no session", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(deleteEmailAccount("some-id")).rejects.toThrow("Unauthorized");
  });
});
