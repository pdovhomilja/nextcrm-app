# Workstream C — SSRF Host-Guarding for IMAP/SMTP Sinks — Design

**Date:** 2026-07-21
**Status:** Implemented 2026-07-21 (branch `security/workstream-c-ssrf-hostguard`, forked from `security/quick-fixes-resend-imap`, unpushed; pending final review)
**Advisory:** GHSA-f5r5-f2v5-74ww (critical) — "Server-Side Request Forgery (SSRF) in nextcrm-app"

## Implementation notes (2026-07-21)

Delivered across 5 commits: `lib/net/ip-rules.ts` (+ `ipaddr.js` 2.4.0), `lib/net/host-guard.ts` (`assertPublicHost`), and host-guarding on all four IMAP/SMTP sink call-sites. Gate green: 211 suites / 1159 tests, tsc clean, `pnpm build` succeeds. Coverage sweep: every `new Imap(`/`createTransport(` with an attacker-controllable host (`accounts.ts` test/discover, `messages.ts` send, `imap-utils.ts` connect) calls `assertPublicHost`; `lib/sendmail.ts` uses `process.env.EMAIL_HOST` (fixed) and is correctly unguarded.

Executed inline (the Agent classifier blocked the security-content dispatches from task 1, as in workstreams A and B), with TDD (every guard test verified RED against pre-guard code) plus tsc/jest/build as the gate. A final whole-branch review is still owed.

Two implementation notes:
- **`203.0.113.9` (TEST-NET-3) is `reserved`, not public** — `ipaddr.js` correctly refuses RFC 5737 documentation ranges; the test table was corrected to reflect that the guard refuses reserved/documentation space too.
- **nodemailer `servername`** is added via a typed spread (`...({ servername } as { servername: string })`) so the object literal keeps only well-known SMTP props and TS resolves the SMTP overload — a direct top-level `servername` tripped an excess-property/wrong-overload error that also broke `info.messageId`.

`MAIL_ALLOW_PRIVATE_HOSTS=true` is the documented escape hatch for self-hosters whose mail server is on a private IP. TLS `rejectUnauthorized` deferred, as designed.

## Problem

The advisory's originally-reported path (a Rossum integration that fetched an attacker-supplied URL with a bearer token) was removed with the invoice module in `6cd94a3a`, so it no longer exists. But the SSRF *class* is still live in the IMAP/SMTP surface: an authenticated user controls the host and port of server-side mail connections, letting them make the server open TCP connections to internal hosts (its own Postgres, MinIO, Inngest, cloud metadata, other private-network services).

Four sink call-sites, all with an attacker-controllable host:

- `actions/emails/accounts.ts` — `testEmailConnection` and `listImapFolders` take `imapHost`/`imapPort` **directly from the request body** and are **non-blind** (they return the connection outcome to the browser), synchronous server actions. This is a live internal port scanner for any authenticated user. `createEmailAccount` stores the same attacker-supplied host for later use.
- `actions/emails/messages.ts` — `sendEmail` builds a nodemailer transport from a **stored** `emailAccount.smtpHost` (the user set it at account creation).
- `inngest/lib/imap-utils.ts` — `connectImap` opens `new Imap({ host: account.imapHost, ... })` from a stored row, called by the background sync job (blind, but still a real SSRF primitive against internal hosts).

The quick-fixes branch (this branch's parent) already narrowed the accounts.ts oracle: an IMAP/SMTP **port allow-list** (`lib/email/imap-safety.ts`: `isAllowedImapPort`/`isAllowedSmtpPort`) and `classifyMailError` (collapses raw driver errors to a fixed set of generic messages, so protocol/banner text no longer leaks). That file's own header states host validation is "the complete fix and is tracked separately" — this workstream is that fix.

There is no host/IP validation, no DNS-rebinding protection, and no shared network guard anywhere in the codebase today.

## Scope

**In scope:** a central `lib/net/` host-guard (reject non-public hosts, with DNS-rebinding protection via IP-pinning) applied to all four IMAP/SMTP sink call-sites, plus store-time host validation in `createEmailAccount`.

**Out of scope (per decision):** `tls.rejectUnauthorized: false` (a MITM/cert-trust weakness, not this SSRF advisory; its proper fix needs a per-account "allow self-signed" flag — schema + UI — deferred to a separate follow-up). The port allow-list and `classifyMailError` are already done on the parent branch and are reused, not re-implemented. Fixed-host sinks are out of scope: `lib/sendmail.ts` (env `EMAIL_HOST`), and the `fetch` calls to OpenAI / ECB / GitHub (hardcoded/env hosts, not IMAP/SMTP).

## Non-goals

- No generic `safe-fetch` HTTP wrapper. The current HTTP `fetch` sinks all use hardcoded/env hosts; a wrapper would harden nothing today and is preventative scope for later.
- No change to the mail drivers, the email schema, or the sync job's structure.

## Architecture

### Why IP-pinning (the DNS-rebinding problem)

The naive guard — resolve the hostname, check the IP is public, then hand the **hostname** to the driver — is defeated by DNS rebinding: the driver re-resolves at connect time (TOCTOU), and an attacker's DNS can return a public IP on the first lookup (passing the check) and `169.254.169.254` / `127.0.0.1` on the second (the actual connect). The fix is to **resolve once, validate every resolved address, then connect to the exact validated IP** — never the hostname. Both installed drivers support this: `imap` v0.8.19 and `nodemailer` v9.0.1 accept a pre-resolved IP as `host` plus the original hostname as `servername`/`tlsOptions.servername` for correct TLS SNI.

### Components

**`lib/net/ip-rules.ts`** — pure IP classification, the security crux, exhaustively unit-tested.

```ts
// Returns true if the address is NOT a public unicast address, i.e. must be
// refused: loopback, private, link-local, unique-local, CGNAT, unspecified,
// broadcast/multicast/reserved, and IPv4-mapped IPv6 wrapping any of the above.
export function isDisallowedAddress(ip: string): boolean;
```

Implementation uses **`ipaddr.js`** (a small, zero-dependency, pure-JS, widely-vetted library; added as a direct dependency — no native build step, so no pnpm-builds friction). Classification via `ipaddr.parse(ip).range()`: allow only `"unicast"`; refuse `loopback`/`private`/`linkLocal`/`uniqueLocal`/`carrierGradeNat`/`unspecified`/`broadcast`/`multicast`/`reserved`. For an IPv4-mapped IPv6 address (`::ffff:a.b.c.d`), unwrap to the embedded IPv4 and classify that. If `ipaddr.js` cannot be added cleanly, hand-roll the same ranges — the exhaustive test table is the safety net either way.

**`lib/net/host-guard.ts`** — the async guard.

```ts
export class HostNotAllowedError extends Error {}

// Resolve `host` and return a validated, pinned address to dial. If `host` is an
// IP literal, validate it directly. Otherwise dns.lookup(host, { all: true }) and
// validate EVERY resolved address; if any is disallowed, throw HostNotAllowedError.
// Env escape hatch: MAIL_ALLOW_PRIVATE_HOSTS === "true" skips validation entirely
// (default off) — for self-hosters whose mail server is on a private IP.
export async function assertPublicHost(
  host: string,
): Promise<{ address: string; hostname: string }>;
```

- IP literal (`net.isIP(host) !== 0`): if `isDisallowedAddress(host)` → throw; else return `{ address: host, hostname: host }`.
- Hostname: `await dns.lookup(host, { all: true, verbatim: true })`. Empty result → throw. If **any** returned address is disallowed → throw. Return `{ address: <first validated address>, hostname: host }` — the caller dials `address` (the pinned IP), keeping `hostname` for TLS SNI.
- `MAIL_ALLOW_PRIVATE_HOSTS === "true"` → return `{ address: host, hostname: host }` without validation.

### Sink integration

Each sink calls `assertPublicHost` before connecting and dials the pinned IP with `servername` set to the original hostname.

- **`testEmailConnection` / `listImapFolders`** (`accounts.ts`): after the existing `isAllowedImapPort` check, `const pinned = await assertPublicHost(input.imapHost)` inside a try/catch; on `HostNotAllowedError`, return `{ ok: false, error: classifyMailError(...) }` — the **same generic "could not connect"** a real failure yields, so a blocked internal host is indistinguishable from an unreachable one (no oracle). Then `new Imap({ host: pinned.address, port: input.imapPort, tls: input.imapSsl, tlsOptions: { servername: pinned.hostname, rejectUnauthorized: false }, ... })`.
- **`createEmailAccount`** (`accounts.ts`): after the port checks, `await assertPublicHost(input.imapHost)` and `assertPublicHost(input.smtpHost)`; on failure, throw the existing validation-style error. Store-time defense-in-depth — a private host cannot be saved, so the stored-host sinks (`sendEmail`, `connectImap`) are protected at the source in addition to their own connect-time guard.
- **`sendEmail`** (`messages.ts`): after resolving the `emailAccount` row, `const pinned = await assertPublicHost(account.smtpHost)` → `nodemailer.createTransport({ host: pinned.address, port: account.smtpPort, secure: account.smtpSsl, servername: account.smtpHost, auth: {...} })`.
- **`connectImap`** (`imap-utils.ts`): `const pinned = await assertPublicHost(account.imapHost)` → `new Imap({ host: pinned.address, ..., tlsOptions: { servername: account.imapHost, rejectUnauthorized: false } })`. Background job; a `HostNotAllowedError` fails the sync for that account (recorded like any connect failure), not reflected to a caller.

`servername` is set for TLS-SNI correctness now (so that when `rejectUnauthorized` is fixed later the SNI is already right); with `rejectUnauthorized: false` still in place it has no functional effect but is correct.

## Data flow / error handling

Guard runs first; a disallowed host means no TCP connection is ever attempted. Failures surface as: the same generic classified message for the non-blind accounts.ts sinks (no oracle), a stored-value rejection for `createEmailAccount`, and a normal sync failure for the background `connectImap`. `assertPublicHost` never returns a hostname as the dial target — always the validated IP.

## Testing

- **`ip-rules` unit tests** — a large allowed/disallowed table: disallow `127.0.0.1`, `10.0.0.1`, `172.16.0.1`, `192.168.1.1`, `169.254.169.254`, `100.64.0.1`, `0.0.0.0`, `255.255.255.255`, `::1`, `fe80::1`, `fc00::1`, `fd00::1`, `::`, `::ffff:127.0.0.1`, `::ffff:10.0.0.1`; allow `8.8.8.8`, `1.1.1.1`, `93.184.216.34`, a public IPv6 (`2606:4700:4700::1111`). Garbage input is treated as disallowed (fail closed).
- **`host-guard` unit tests** (mock `node:dns/promises` `lookup`): a hostname resolving to a public IP returns that pinned IP; resolving to a private IP throws `HostNotAllowedError`; **mixed** results (one public + one private) throw (all must pass); an empty resolution throws; a public IP literal returns itself; a private IP literal throws; `MAIL_ALLOW_PRIVATE_HOSTS=true` bypasses. Fail-closed on lookup error.
- **Sink tests** — for each sink: when `assertPublicHost` throws, the driver constructor (`new Imap` / `createTransport`) is **not** called and the sink returns/raises the expected non-leaking result; when it resolves, the driver receives `host: <pinned IP>` (not the hostname) and `servername: <hostname>`. The accounts.ts sinks additionally assert a blocked host yields the same classified message as an unreachable host.
- **Every test must fail against the pre-guard code** — the acceptance bar.

## Compatibility & rollout

- One new dependency (`ipaddr.js`, pure JS) and two new files; no schema change, no migration.
- **Behavioral change:** connecting to or storing a mail account on a loopback/private/link-local host now fails. Self-hosters with an internal mail server set `MAIL_ALLOW_PRIVATE_HOSTS=true` (documented). This is the intended, security-motivated change.
- The advisory stays unpublished until this lands; on completion its affected range should be corrected (the reported Rossum path was removed in `6cd94a3a`, so "all versions" is wrong) and it can be published narrowed to the IMAP/SMTP surface.

## Packaging

One implementation plan, five tasks: (1) `lib/net/ip-rules.ts` + `ipaddr.js` dependency + exhaustive tests; (2) `lib/net/host-guard.ts` + tests (dns mocked); (3) the three `accounts.ts` sinks (test/discover/create); (4) `messages.ts` `sendEmail` + `imap-utils.ts` `connectImap`; (5) verification (full suite, tsc, build, and a sweep confirming no `new Imap(`/`createTransport(` with an attacker-controllable host remains unguarded). Executed via subagent-driven development where possible; inline fallback if the Agent classifier blocks the security content (as in workstreams A and B).
