# SSRF Host-Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop an authenticated user from making the server open IMAP/SMTP connections to internal/private hosts, by validating and IP-pinning the destination of every attacker-controllable mail sink (GHSA-f5r5-f2v5-74ww).

**Architecture:** A pure `lib/net/ip-rules.ts` classifies addresses (allow only public unicast). `lib/net/host-guard.ts` `assertPublicHost(host)` resolves the host once, validates every resolved address, and returns a pinned IP + the original hostname. Each sink dials the pinned IP (closing DNS rebinding) with the hostname as TLS `servername`.

**Tech Stack:** Node 22 `node:dns/promises` + `node:net`, `ipaddr.js` (new), `imap` v0.8.19, `nodemailer` v9.0.1, jest 30.

Spec: `docs/superpowers/specs/2026-07-21-ssrf-host-guard-design.md`

## Global Constraints

- **Allow only public unicast addresses.** Refuse loopback, private (`10/8`, `172.16/12`, `192.168/16`), link-local (`169.254/16`, `fe80::/10`), unique-local (`fc00::/7`), CGNAT (`100.64/10`), unspecified (`0.0.0.0`, `::`), broadcast/multicast/reserved, and IPv4-mapped IPv6 wrapping any of the above. Unparseable input is refused (fail closed).
- **IP-pinning is the rebinding fix.** Sinks dial the validated IP (`pinned.address`), never the hostname; the original hostname rides as `servername` for TLS SNI. Never re-resolve after validating.
- **Env escape hatch:** `MAIL_ALLOW_PRIVATE_HOSTS === "true"` bypasses validation (default off) — documented for self-hosters with an internal mail server.
- **No existence/host oracle:** a blocked host in the non-blind accounts.ts sinks returns the *same* classified "could not connect" message a real unreachable host yields, via the inherited `classifyMailError`.
- **Do NOT change `tls.rejectUnauthorized: false`** — deferred to a separate workstream. Set `servername` for SNI correctness, but leave `rejectUnauthorized` as-is.
- Reuse, don't re-implement: `lib/email/imap-safety.ts` (`isAllowedImapPort`/`isAllowedSmtpPort`/`classifyMailError`) already exists on this branch — keep the existing port checks.
- Run jest via `./node_modules/.bin/jest <path>` (NEVER `pnpm test` — `ERR_PNPM_IGNORED_BUILDS`). Finish each task with `pnpm exec tsc --noEmit` clean.
- **Every regression test must FAIL against the pre-guard code** — the acceptance bar.
- Conventional commits, one per task. Work on `security/workstream-c-ssrf-hostguard` (forked from `security/quick-fixes-resend-imap`).

### Reusable `imap` mock (Tasks 3 & 4)

To assert host-pinning without a real connection, mock the `imap` module with a constructor that records its config and drives the event flow. The recording array MUST be named with a `mock` prefix — a `jest.mock` factory may not reference any other out-of-scope variable:

```ts
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
beforeEach(() => { mockImapInstances.length = 0; });
// after a call: expect(mockImapInstances[0].config.host).toBe("1.2.3.4")
```

If `import Imap from "imap"` does not resolve the mock as a constructor under the repo's esModuleInterop, drop the `{ __esModule: true, default: ... }` wrapper and return `ctor` directly — verify via the RED run.

---

### Task 1: `lib/net/ip-rules.ts` + `ipaddr.js` dependency

**Files:**
- Add dependency: `ipaddr.js`
- Create: `lib/net/ip-rules.ts`
- Test: `lib/net/__tests__/ip-rules.test.ts` (new)

**Interfaces:**
- Produces: `isDisallowedAddress(ip: string): boolean` — true if `ip` is NOT a public unicast address (must be refused). Consumed by Task 2.

- [ ] **Step 1: Add the dependency**

Run: `pnpm add ipaddr.js`
Expected: installs cleanly (pure JS, no postinstall/build script — no `ERR_PNPM_IGNORED_BUILDS`). Confirm: `node -e "console.log(require('ipaddr.js/package.json').version)"` prints a version.
If `pnpm add` fails for environment reasons, hand-roll `ip-rules.ts` covering the exact ranges in Global Constraints — the Step 2 test table is the safety net. Do not proceed without one or the other.

- [ ] **Step 2: Write the failing tests**

Create `lib/net/__tests__/ip-rules.test.ts`:

```ts
import { isDisallowedAddress } from "../ip-rules";

describe("isDisallowedAddress", () => {
  const disallowed = [
    "127.0.0.1", "127.1.2.3", "10.0.0.1", "172.16.0.1", "172.31.255.255",
    "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "255.255.255.255", "224.0.0.1",
    "::1", "fe80::1", "fc00::1", "fd12:3456::1", "::",
    "::ffff:127.0.0.1", "::ffff:10.0.0.1", "::ffff:192.168.0.1",
    "not-an-ip", "", "999.999.999.999",
  ];
  const allowed = [
    "8.8.8.8", "1.1.1.1", "93.184.216.34", "203.0.113.9",
    "2606:4700:4700::1111", "2001:4860:4860::8888",
    "::ffff:8.8.8.8", // IPv4-mapped public → allowed
  ];

  it.each(disallowed)("refuses %s", (ip) => {
    expect(isDisallowedAddress(ip)).toBe(true);
  });
  it.each(allowed)("allows %s", (ip) => {
    expect(isDisallowedAddress(ip)).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify RED** — `./node_modules/.bin/jest lib/net/__tests__/ip-rules.test.ts` fails (module not found).

- [ ] **Step 4: Implement `lib/net/ip-rules.ts`**

```ts
import ipaddr from "ipaddr.js";

// Refuse everything that is not a public unicast address: loopback, private,
// link-local, unique-local, CGNAT, unspecified, broadcast/multicast/reserved,
// and IPv4-mapped IPv6 wrapping any of the above. Unparseable input is refused
// (fail closed). Used by the SSRF host guard before dialling any mail server.
export function isDisallowedAddress(ip: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(ip);
  } catch {
    return true; // fail closed on anything we cannot parse
  }
  // Unwrap IPv4-mapped IPv6 (::ffff:a.b.c.d) and classify the embedded IPv4.
  if (addr.kind() === "ipv6" && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
    addr = (addr as ipaddr.IPv6).toIPv4Address();
  }
  // ipaddr's range() returns "unicast" only for globally-routable unicast space;
  // every other classification (loopback/private/linkLocal/uniqueLocal/
  // carrierGradeNat/unspecified/broadcast/multicast/reserved/...) is refused.
  return addr.range() !== "unicast";
}
```

- [ ] **Step 5: GREEN + typecheck** — the test passes; `pnpm exec tsc --noEmit` clean.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/net/ip-rules.ts lib/net/__tests__/ip-rules.test.ts
git commit -m "feat(net): ip-rules — refuse non-public-unicast addresses (SSRF)"
```

---

### Task 2: `lib/net/host-guard.ts` — `assertPublicHost`

**Files:**
- Create: `lib/net/host-guard.ts`
- Test: `lib/net/__tests__/host-guard.test.ts` (new)

**Interfaces:**
- Consumes: `isDisallowedAddress` (Task 1).
- Produces: `class HostNotAllowedError extends Error`; `assertPublicHost(host: string): Promise<{ address: string; hostname: string }>` — resolves `host`, validates every resolved address, returns the pinned IP + original hostname; throws `HostNotAllowedError` on any disallowed/unresolvable host. Consumed by Tasks 3 & 4.

- [ ] **Step 1: Write the failing tests**

Create `lib/net/__tests__/host-guard.test.ts`:

```ts
jest.mock("node:dns/promises", () => ({ lookup: jest.fn() }));

import { lookup } from "node:dns/promises";
import { assertPublicHost, HostNotAllowedError } from "../host-guard";

const mockLookup = lookup as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.MAIL_ALLOW_PRIVATE_HOSTS;
});

it("returns the pinned IP for a host resolving to a public address", async () => {
  mockLookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  const res = await assertPublicHost("mail.example.com");
  expect(res).toEqual({ address: "93.184.216.34", hostname: "mail.example.com" });
});

it("throws when the host resolves to a private address", async () => {
  mockLookup.mockResolvedValue([{ address: "10.0.0.5", family: 4 }]);
  await expect(assertPublicHost("evil.example.com")).rejects.toBeInstanceOf(HostNotAllowedError);
});

it("throws when ANY resolved address is disallowed (mixed results)", async () => {
  mockLookup.mockResolvedValue([
    { address: "93.184.216.34", family: 4 },
    { address: "169.254.169.254", family: 4 },
  ]);
  await expect(assertPublicHost("rebind.example.com")).rejects.toBeInstanceOf(HostNotAllowedError);
});

it("throws on empty resolution", async () => {
  mockLookup.mockResolvedValue([]);
  await expect(assertPublicHost("nx.example.com")).rejects.toBeInstanceOf(HostNotAllowedError);
});

it("throws when lookup rejects (fail closed)", async () => {
  mockLookup.mockRejectedValue(new Error("ENOTFOUND"));
  await expect(assertPublicHost("nx.example.com")).rejects.toBeInstanceOf(HostNotAllowedError);
});

it("validates a public IP literal without a lookup", async () => {
  const res = await assertPublicHost("8.8.8.8");
  expect(res).toEqual({ address: "8.8.8.8", hostname: "8.8.8.8" });
  expect(mockLookup).not.toHaveBeenCalled();
});

it("throws for a private IP literal", async () => {
  await expect(assertPublicHost("127.0.0.1")).rejects.toBeInstanceOf(HostNotAllowedError);
  expect(mockLookup).not.toHaveBeenCalled();
});

it("bypasses validation when MAIL_ALLOW_PRIVATE_HOSTS=true", async () => {
  process.env.MAIL_ALLOW_PRIVATE_HOSTS = "true";
  const res = await assertPublicHost("mail.internal");
  expect(res).toEqual({ address: "mail.internal", hostname: "mail.internal" });
  expect(mockLookup).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: RED** — `./node_modules/.bin/jest lib/net/__tests__/host-guard.test.ts` fails (module not found).

- [ ] **Step 3: Implement `lib/net/host-guard.ts`**

```ts
import { lookup } from "node:dns/promises";
import net from "node:net";
import { isDisallowedAddress } from "./ip-rules";

export class HostNotAllowedError extends Error {
  constructor(message = "Host is not allowed") {
    super(message);
    this.name = "HostNotAllowedError";
  }
}

// Resolve `host` once and return a validated, pinned address to dial. If any
// resolved address is non-public (or the host is unresolvable), throw. Callers
// MUST dial the returned `address` (the pinned IP), keeping `hostname` for TLS
// SNI — dialling the hostname would re-resolve and reopen the DNS-rebinding hole.
export async function assertPublicHost(
  host: string,
): Promise<{ address: string; hostname: string }> {
  if (process.env.MAIL_ALLOW_PRIVATE_HOSTS === "true") {
    return { address: host, hostname: host };
  }

  if (net.isIP(host) !== 0) {
    if (isDisallowedAddress(host)) throw new HostNotAllowedError();
    return { address: host, hostname: host };
  }

  let results: { address: string; family: number }[];
  try {
    results = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new HostNotAllowedError();
  }
  if (!results || results.length === 0) throw new HostNotAllowedError();
  for (const r of results) {
    if (isDisallowedAddress(r.address)) throw new HostNotAllowedError();
  }
  return { address: results[0].address, hostname: host };
}
```

- [ ] **Step 4: GREEN + typecheck** — the test passes; `pnpm exec tsc --noEmit` clean.

- [ ] **Step 5: Commit**

```bash
git add lib/net/host-guard.ts lib/net/__tests__/host-guard.test.ts
git commit -m "feat(net): assertPublicHost — resolve-validate-pin guard against SSRF/DNS-rebinding"
```

---

### Task 3: Guard the `accounts.ts` sinks

**Files:**
- Modify: `actions/emails/accounts.ts` (`createEmailAccount`, `testEmailConnection`, `listImapFolders`)
- Test: `actions/emails/__tests__/accounts-ssrf.test.ts` (new)

**Interfaces:**
- Consumes: `assertPublicHost`, `HostNotAllowedError` from `@/lib/net/host-guard`; existing `classifyMailError` from `@/lib/email/imap-safety`.

- [ ] **Step 1: Write the failing tests**

Create `actions/emails/__tests__/accounts-ssrf.test.ts`. Mock `@/lib/auth-server` (getSession), `@/lib/prisma`, `@/lib/email-crypto`, `@/lib/net/host-guard`, and `imap` (use the reusable imap mock from Global Constraints). Real `@/lib/email/imap-safety` (do not mock — its port allow-list and classifyMailError are under test too). Cases:

```ts
it("testEmailConnection: a blocked host is not dialled and returns the generic connect error", async () => {
  getSess.mockResolvedValue({ user: { id: "u1" } });
  (assertPublicHost as jest.Mock).mockRejectedValue(new HostNotAllowedError());
  const res = await testEmailConnection({ imapHost: "127.0.0.1", imapPort: 993, imapSsl: true, username: "u", password: "p" });
  expect(res.ok).toBe(false);
  // same message a real unreachable host yields (no oracle):
  expect(res.error).toBe(classifyMailError({ message: "ECONNREFUSED" } as Error));
  expect(mockImapInstances.length).toBe(0); // no connection attempted
});

it("testEmailConnection: an allowed host is dialled on the PINNED IP with servername=hostname", async () => {
  getSess.mockResolvedValue({ user: { id: "u1" } });
  (assertPublicHost as jest.Mock).mockResolvedValue({ address: "93.184.216.34", hostname: "mail.example.com" });
  const res = await testEmailConnection({ imapHost: "mail.example.com", imapPort: 993, imapSsl: true, username: "u", password: "p" });
  expect(res).toEqual({ ok: true });
  expect(mockImapInstances[0].config.host).toBe("93.184.216.34");
  expect(mockImapInstances[0].config.tlsOptions.servername).toBe("mail.example.com");
});

it("listImapFolders: a blocked host is not dialled", async () => {
  getSess.mockResolvedValue({ user: { id: "u1" } });
  (assertPublicHost as jest.Mock).mockRejectedValue(new HostNotAllowedError());
  const res = await listImapFolders({ imapHost: "10.0.0.5", imapPort: 993, imapSsl: true, username: "u", password: "p" });
  expect(res.ok).toBe(false);
  expect(mockImapInstances.length).toBe(0);
});

it("createEmailAccount: rejects a private mail host (store-time defense) and does not create", async () => {
  getSess.mockResolvedValue({ user: { id: "u1" } });
  (assertPublicHost as jest.Mock).mockRejectedValue(new HostNotAllowedError());
  await expect(createEmailAccount({
    label: "x", imapHost: "127.0.0.1", imapPort: 993, imapSsl: true,
    smtpHost: "127.0.0.1", smtpPort: 465, smtpSsl: true, username: "u", password: "p",
  })).rejects.toThrow();
  expect(prismadb.emailAccount.create).not.toHaveBeenCalled();
});
```

Wire the imap mock's `mockImapInstances` array, and `jest.mock("@/lib/net/host-guard", () => ({ assertPublicHost: jest.fn(), HostNotAllowedError: class HostNotAllowedError extends Error {} }))`.

- [ ] **Step 2: RED** — the tests fail (no host guard; the blocked-host tests still attempt/allow the connection).

- [ ] **Step 3: Add imports** to `actions/emails/accounts.ts`:

```ts
import { assertPublicHost, HostNotAllowedError } from "@/lib/net/host-guard";
```

- [ ] **Step 4: Guard `testEmailConnection`** — after the port check, resolve+pin before building the Imap:

```ts
  if (!isAllowedImapPort(input.imapPort)) {
    return { ok: false, error: "Unsupported IMAP port" };
  }

  let pinned: { address: string; hostname: string };
  try {
    pinned = await assertPublicHost(input.imapHost);
  } catch (e) {
    if (e instanceof HostNotAllowedError) {
      // Indistinguishable from a real unreachable host — no SSRF oracle.
      return { ok: false, error: classifyMailError({ message: "ECONNREFUSED" } as Error) };
    }
    throw e;
  }

  const connectionPromise = new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const imap = new Imap({
      user: input.username,
      password: input.password,
      host: pinned.address,
      port: input.imapPort,
      tls: input.imapSsl,
      // Dial the validated IP; keep the hostname for TLS SNI. (rejectUnauthorized
      // left as-is — TLS verification is a separate workstream.)
      tlsOptions: { servername: pinned.hostname, rejectUnauthorized: false },
      authTimeout: 8000,
      connTimeout: 8000,
    });
    // ...unchanged ready/error/connect...
```

- [ ] **Step 5: Guard `listImapFolders`** — same shape: after the port check, `assertPublicHost` (on `HostNotAllowedError` return `{ ok: false, error: classifyMailError({ message: "ECONNREFUSED" } as Error) }`), then `new Imap({ ..., host: pinned.address, tlsOptions: { servername: pinned.hostname, rejectUnauthorized: false }, ... })`.

- [ ] **Step 6: Guard `createEmailAccount`** — after the port checks, validate both hosts at store time:

```ts
  if (!isAllowedImapPort(input.imapPort)) throw new Error("Unsupported IMAP port");
  if (!isAllowedSmtpPort(input.smtpPort)) throw new Error("Unsupported SMTP port");

  try {
    await assertPublicHost(input.imapHost);
    await assertPublicHost(input.smtpHost);
  } catch (e) {
    if (e instanceof HostNotAllowedError) throw new Error("Mail host is not allowed");
    throw e;
  }
```

- [ ] **Step 7: GREEN + typecheck** — the SSRF test passes; the existing `actions/emails/__tests__/accounts.test.ts` still passes (run it); `pnpm exec tsc --noEmit` clean.

- [ ] **Step 8: Commit**

```bash
git add actions/emails/accounts.ts actions/emails/__tests__/accounts-ssrf.test.ts
git commit -m "feat(security): SSRF host-guard on IMAP test/discover/create sinks"
```

---

### Task 4: Guard `sendEmail` (SMTP) and `connectImap` (background IMAP)

**Files:**
- Modify: `actions/emails/messages.ts` (`sendEmail`)
- Modify: `inngest/lib/imap-utils.ts` (`connectImap`)
- Test: `actions/emails/__tests__/messages-ssrf.test.ts` (new), `inngest/lib/__tests__/imap-utils-ssrf.test.ts` (new)

**Interfaces:**
- Consumes: `assertPublicHost`, `HostNotAllowedError` (Task 2).

- [ ] **Step 1: Write the failing tests**

`actions/emails/__tests__/messages-ssrf.test.ts` — mock `@/lib/auth-server`, `@/lib/prisma`, `@/lib/email-crypto`, `@/lib/net/host-guard`, and `nodemailer` (capture `createTransport` args):

```ts
const createTransport = jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({ messageId: "m1" }) }));
jest.mock("nodemailer", () => ({ __esModule: true, default: { createTransport } }));

it("sendEmail: a blocked stored SMTP host is not dialled", async () => {
  requireSessionMock(); // getSession -> { user: { id: "u1" } }
  (prismadb.emailAccount.findFirst as jest.Mock).mockResolvedValue({
    id: "a1", userId: "u1", smtpHost: "127.0.0.1", smtpPort: 465, smtpSsl: true,
    username: "u", passwordEncrypted: "enc",
  });
  (assertPublicHost as jest.Mock).mockRejectedValue(new HostNotAllowedError());
  await expect(sendEmail({ accountId: "a1", to: ["x@y.z"], subject: "s", body: "b" } as any)).rejects.toThrow();
  expect(createTransport).not.toHaveBeenCalled();
});

it("sendEmail: an allowed host dials the PINNED IP with servername=hostname", async () => {
  requireSessionMock();
  (prismadb.emailAccount.findFirst as jest.Mock).mockResolvedValue({
    id: "a1", userId: "u1", smtpHost: "smtp.example.com", smtpPort: 465, smtpSsl: true,
    username: "u", passwordEncrypted: "enc",
  });
  (assertPublicHost as jest.Mock).mockResolvedValue({ address: "93.184.216.34", hostname: "smtp.example.com" });
  await sendEmail({ accountId: "a1", to: ["x@y.z"], subject: "s", body: "b" } as any);
  const cfg = createTransport.mock.calls[0][0];
  expect(cfg.host).toBe("93.184.216.34");
  expect(cfg.servername).toBe("smtp.example.com");
});
```

`inngest/lib/__tests__/imap-utils-ssrf.test.ts` — mock `@/lib/net/host-guard` and `imap` (reusable imap mock):

```ts
it("connectImap: a blocked host is not dialled", async () => {
  (assertPublicHost as jest.Mock).mockRejectedValue(new HostNotAllowedError());
  await expect(connectImap({ username: "u", password: "p", imapHost: "10.0.0.5", imapPort: 993, imapSsl: true }))
    .rejects.toThrow();
  expect(mockImapInstances.length).toBe(0);
});

it("connectImap: an allowed host dials the PINNED IP with servername=hostname", async () => {
  (assertPublicHost as jest.Mock).mockResolvedValue({ address: "93.184.216.34", hostname: "imap.example.com" });
  await connectImap({ username: "u", password: "p", imapHost: "imap.example.com", imapPort: 993, imapSsl: true });
  expect(mockImapInstances[0].config.host).toBe("93.184.216.34");
  expect(mockImapInstances[0].config.tlsOptions.servername).toBe("imap.example.com");
});
```

- [ ] **Step 2: RED** — both fail (no guard).

- [ ] **Step 3: Guard `sendEmail`** (`actions/emails/messages.ts`) — add the import and pin the SMTP host:

```ts
import { assertPublicHost, HostNotAllowedError } from "@/lib/net/host-guard";
// ...
  if (!account) throw new Error("Account not found");

  let pinned: { address: string; hostname: string };
  try {
    pinned = await assertPublicHost(account.smtpHost);
  } catch (e) {
    if (e instanceof HostNotAllowedError) throw new Error("Mail host is not allowed");
    throw e;
  }

  const password = decrypt(account.passwordEncrypted);

  const transporter = nodemailer.createTransport({
    host: pinned.address,
    port: account.smtpPort,
    secure: account.smtpSsl,
    servername: account.smtpHost,
    auth: { user: account.username, pass: password },
  });
  // ...unchanged sendMail...
```

- [ ] **Step 4: Guard `connectImap`** (`inngest/lib/imap-utils.ts`) — make it async and pin the host:

```ts
import { assertPublicHost } from "@/lib/net/host-guard";
// ...
export async function connectImap(account: ImapAccount): Promise<Imap> {
  const pinned = await assertPublicHost(account.imapHost);
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: account.username,
      password: account.password,
      host: pinned.address,
      port: account.imapPort,
      tls: account.imapSsl,
      tlsOptions: { servername: account.imapHost, rejectUnauthorized: false },
      authTimeout: 15000,
      connTimeout: 15000,
    });
    imap.once("ready", () => {
      imap.removeAllListeners("error");
      resolve(imap);
    });
    imap.once("error", reject);
    imap.connect();
  });
}
```

(`connectImap` already returned a `Promise<Imap>`; it is now `async` but the return type is unchanged, so callers in `inngest/functions/emails/sync-account.ts` — which `await` it — need no change. Verify `pnpm exec tsc --noEmit` after.)

- [ ] **Step 5: GREEN + typecheck** — both new tests pass; existing `inngest`/`emails` suites stay green (run them); `pnpm exec tsc --noEmit` clean.

- [ ] **Step 6: Commit**

```bash
git add actions/emails/messages.ts inngest/lib/imap-utils.ts actions/emails/__tests__/messages-ssrf.test.ts inngest/lib/__tests__/imap-utils-ssrf.test.ts
git commit -m "feat(security): SSRF host-guard on SMTP send and background IMAP connect"
```

---

### Task 5: Verification gate + sweep

**Files:**
- Modify: `docs/superpowers/specs/2026-07-21-ssrf-host-guard-design.md` (mark implemented)

- [ ] **Step 1: Sweep for unguarded sinks** — every `new Imap(` / `createTransport(` with an attacker-controllable host must be preceded by `assertPublicHost`:

```bash
grep -rnE 'new Imap\(|createTransport\(' actions inngest lib
```

Expected sinks and their state: `actions/emails/accounts.ts` (test + discover — guarded), `inngest/lib/imap-utils.ts` (guarded), `actions/emails/messages.ts` (guarded), `lib/sendmail.ts` (`createTransport` on `process.env.EMAIL_HOST` — fixed host, out of scope, no guard needed). Any other hit with a request- or DB-supplied host is a straggler — a failed task, not a note.

- [ ] **Step 2: Full suite** — `./node_modules/.bin/jest` — all pass (this branch's baseline plus the new net + ssrf suites, 0 failures).

- [ ] **Step 3: Typecheck + build** — `pnpm exec tsc --noEmit && pnpm build` — both succeed.

- [ ] **Step 4: Mark the spec implemented** — set `Status:` to implemented; record the sweep result and that `MAIL_ALLOW_PRIVATE_HOSTS` is the documented self-hoster escape hatch.

- [ ] **Step 5: Commit (no push — final review first)**

```bash
git add docs/superpowers/specs/2026-07-21-ssrf-host-guard-design.md
git commit -m "docs: mark SSRF host-guard workstream implemented"
```

---

## Notes for the executor

- The pinned IP goes in `host`; the original hostname goes in `servername` — never dial the hostname, or DNS rebinding reopens.
- Blocked hosts in the two non-blind accounts.ts sinks must return the exact `classifyMailError({ message: "ECONNREFUSED" } as Error)` string — the same a real refusal yields — so there is no block-vs-unreachable oracle.
- Do not touch `rejectUnauthorized` — set `servername` only.
- `lib/sendmail.ts` uses a fixed env host and is intentionally NOT guarded.
- Every scope/guard test must fail with the guard removed.
- If the Agent classifier blocks subagent dispatch (as in workstreams A and B), execute inline with tsc + jest as the gate.
```
