// SSRF host-guard regression tests for the accounts.ts IMAP sinks
// (GHSA-f5r5-f2v5-74ww). classifyMailError is the REAL module (its output is
// what a blocked host must match). The imap mock records constructor config so
// we can assert the pinned IP is dialled, not the hostname.

const mockImapInstances: any[] = [];
jest.mock("imap", () => {
  const ctor = jest.fn().mockImplementation((config: any) => {
    const handlers: Record<string, (...a: any[]) => void> = {};
    const inst = {
      config,
      once: (ev: string, cb: any) => { handlers[ev] = cb; return inst; },
      connect: () => { queueMicrotask(() => handlers["ready"]?.()); },
      end: () => {},
      getBoxes: (_: string, cb: any) => cb(null, {}),
    };
    mockImapInstances.push(inst);
    return inst;
  });
  return { __esModule: true, default: ctor };
});
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    emailAccount: {
      create: jest.fn().mockResolvedValue({ id: "acc-1", label: "x" }),
    },
  },
}));
jest.mock("@/lib/email-crypto", () => ({ encrypt: jest.fn(() => "enc"), decrypt: jest.fn(() => "pw") }));
jest.mock("@/lib/net/host-guard", () => ({
  assertPublicHost: jest.fn(),
  HostNotAllowedError: class HostNotAllowedError extends Error {},
}));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { assertPublicHost, HostNotAllowedError } from "@/lib/net/host-guard";
import { classifyMailError } from "@/lib/email/imap-safety";
import { testEmailConnection, listImapFolders, createEmailAccount } from "@/actions/emails/accounts";

const getSess = getSession as jest.Mock;
const guard = assertPublicHost as jest.Mock;
const BLOCKED_MSG = classifyMailError({ message: "ECONNREFUSED" } as Error);

beforeEach(() => {
  jest.clearAllMocks();
  mockImapInstances.length = 0;
  getSess.mockResolvedValue({ user: { id: "u1" } });
});

describe("testEmailConnection", () => {
  it("a blocked host is not dialled and returns the generic connect error", async () => {
    guard.mockRejectedValue(new HostNotAllowedError());
    const res = await testEmailConnection({
      imapHost: "127.0.0.1", imapPort: 993, imapSsl: true, username: "u", password: "p",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe(BLOCKED_MSG);
    expect(mockImapInstances.length).toBe(0);
  });

  it("an allowed host is dialled on the PINNED IP with servername=hostname", async () => {
    guard.mockResolvedValue({ address: "93.184.216.34", hostname: "mail.example.com" });
    const res = await testEmailConnection({
      imapHost: "mail.example.com", imapPort: 993, imapSsl: true, username: "u", password: "p",
    });
    expect(res).toEqual({ ok: true });
    expect(mockImapInstances[0].config.host).toBe("93.184.216.34");
    expect(mockImapInstances[0].config.tlsOptions.servername).toBe("mail.example.com");
  });
});

describe("listImapFolders", () => {
  it("a blocked host is not dialled", async () => {
    guard.mockRejectedValue(new HostNotAllowedError());
    const res = await listImapFolders({
      imapHost: "10.0.0.5", imapPort: 993, imapSsl: true, username: "u", password: "p",
    });
    expect(res.ok).toBe(false);
    expect(mockImapInstances.length).toBe(0);
  });

  it("an allowed host is dialled on the PINNED IP", async () => {
    guard.mockResolvedValue({ address: "93.184.216.34", hostname: "imap.example.com" });
    await listImapFolders({
      imapHost: "imap.example.com", imapPort: 993, imapSsl: true, username: "u", password: "p",
    });
    expect(mockImapInstances[0].config.host).toBe("93.184.216.34");
    expect(mockImapInstances[0].config.tlsOptions.servername).toBe("imap.example.com");
  });
});

describe("createEmailAccount", () => {
  const input = {
    label: "x", imapHost: "127.0.0.1", imapPort: 993, imapSsl: true,
    smtpHost: "127.0.0.1", smtpPort: 465, smtpSsl: true, username: "u", password: "p",
  };

  it("rejects a private mail host (store-time defense) and does not create", async () => {
    guard.mockRejectedValue(new HostNotAllowedError());
    await expect(createEmailAccount(input)).rejects.toThrow();
    expect(prismadb.emailAccount.create).not.toHaveBeenCalled();
  });

  it("creates for public mail hosts", async () => {
    guard.mockResolvedValue({ address: "93.184.216.34", hostname: "mail.example.com" });
    await createEmailAccount({ ...input, imapHost: "mail.example.com", smtpHost: "smtp.example.com" });
    expect(prismadb.emailAccount.create).toHaveBeenCalled();
  });
});
