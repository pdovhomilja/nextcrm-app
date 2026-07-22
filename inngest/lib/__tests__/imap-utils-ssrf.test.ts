// SSRF host-guard regression tests for connectImap (background IMAP sink).
const mockImapInstances: any[] = [];
jest.mock("imap", () => {
  const ctor = jest.fn().mockImplementation((config: any) => {
    const handlers: Record<string, (...a: any[]) => void> = {};
    const inst = {
      config,
      once: (ev: string, cb: any) => { handlers[ev] = cb; return inst; },
      removeAllListeners: () => {},
      connect: () => { queueMicrotask(() => handlers["ready"]?.()); },
      end: () => {},
    };
    mockImapInstances.push(inst);
    return inst;
  });
  return { __esModule: true, default: ctor };
});
jest.mock("mailparser", () => ({ simpleParser: jest.fn() }));
jest.mock("@/lib/net/host-guard", () => ({
  assertPublicHost: jest.fn(),
  HostNotAllowedError: class HostNotAllowedError extends Error {},
}));

import { assertPublicHost, HostNotAllowedError } from "@/lib/net/host-guard";
import { connectImap } from "@/inngest/lib/imap-utils";

const guard = assertPublicHost as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockImapInstances.length = 0;
});

it("a blocked host is not dialled", async () => {
  guard.mockRejectedValue(new HostNotAllowedError());
  await expect(
    connectImap({ username: "u", password: "p", imapHost: "10.0.0.5", imapPort: 993, imapSsl: true })
  ).rejects.toThrow();
  expect(mockImapInstances.length).toBe(0);
});

it("an allowed host dials the PINNED IP with servername=hostname", async () => {
  guard.mockResolvedValue({ address: "93.184.216.34", hostname: "imap.example.com" });
  await connectImap({ username: "u", password: "p", imapHost: "imap.example.com", imapPort: 993, imapSsl: true });
  expect(mockImapInstances[0].config.host).toBe("93.184.216.34");
  expect(mockImapInstances[0].config.tlsOptions.servername).toBe("imap.example.com");
});
