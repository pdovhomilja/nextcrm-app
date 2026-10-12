# Plugin Host Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the findings deferred from the plugin system v0 review (PR #327, "Deferred: fix before the first real plugin") so the first real plugins (`registry-ares`, `account-protection`) can be installed safely, plus the pre-existing audit enum gap for `imported`/`cancelled`.

**Architecture:** Targeted fixes inside the existing plugin host (`lib/plugins/*`, `lib/net/host-guard.ts`, `instrumentation.ts`), one concern per task, each with jest tests in the existing mock style. No new modules except one migration.

**Tech Stack:** Next.js 16, Prisma 7 (`@prisma/client`, pg adapter), Inngest, jest, zod 4.

**Spec:** `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (plugin system v0). The findings are listed in the PR #327 description, section "Deferred: fix before the first real plugin".

## Global Constraints

- No behaviour change on an instance with zero plugins (empty registry): no extra DB queries, transactions or events on any core write path.
- Nothing client-specific (no OXO/GIPS names, IDs, numbers) in core or public plugins.
- Plugins import only `@nextcrm/plugin-sdk`; the SDK's public types do not change in this plan.
- Do not start dev servers, Inngest dev, Docker containers or other long-running processes. Do not create, copy or edit `.env*` files.
- Tests: `pnpm exec jest <paths>`; full suite `pnpm exec jest --testPathIgnorePatterns "__tests__/invoices/lifecycle"`. Three suites fail on `main` already and are baseline: `enrich-target-job`, `enrich-contact-job`, `google-sync-classify`.
- `pnpm exec tsc --noEmit` must stay clean; run `pnpm exec eslint` on touched files.
- Commits: conventional style (`fix(plugins): …`), one per task, never push.

## Review Focus

1. A plugin that is installed but has no rules or after-actions for an entity still has its `PluginData` rows removed when that record is hard-deleted (Task 2 test "cleans plugin data on hard delete when only stores are used").
2. A plugin filter on `ctx.data.users.find` using `password` (directly or through a relation) is refused, not silently ignored (Task 6 tests).
3. A plugin HTTP call to a public URL that redirects to `http://127.0.0.1/...` fails with `HostNotAllowedError` (Task 4 test).
4. A failed `inngest.send` during install leaves no installed row, so the admin can simply retry (Task 7 test).
5. A server boot with an installed plugin needing `onUpgrade` serves requests immediately; the upgrade runs in the background (Task 7 test on `instrumentation.ts`).

---

### Task 1: Audit enum values `imported` and `cancelled`

`AuditAction` in `lib/audit-log.ts` lists `imported` (used by `actions/crm/products/import-products.ts`) and `cancelled` (used by `actions/crm/account-products/remove-assignment/index.ts`), but `crm_AuditLog_Action` in the DB does not, so those audit writes fail silently (`AUDIT_LOG_WRITE_FAILED`).

**Files:**
- Modify: `prisma/schema.prisma` (enum `crm_AuditLog_Action`)
- Create: `prisma/migrations/20261009000000_audit_imported_cancelled/migration.sql`
- Modify: `lib/plugins/__tests__/audit-actions.test.ts` → move to `__tests__/audit-log/audit-actions.test.ts` and cover every `AuditAction`

**Interfaces:** none.

- [ ] **Step 1: Write the failing test.** `git mv lib/plugins/__tests__/audit-actions.test.ts __tests__/audit-log/audit-actions.test.ts` and replace its content:

```ts
import { crm_AuditLog_Action } from "@prisma/client";
import type { AuditAction } from "@/lib/audit-log";

// Every action writeAuditLog accepts must exist in the DB enum,
// or the write fails silently (AUDIT_LOG_WRITE_FAILED).
const ALL: Record<AuditAction, true> = {
  created: true, updated: true, deleted: true, restored: true, relation_added: true, relation_removed: true,
  imported: true, cancelled: true,
  installed: true, uninstalled: true, enabled: true, disabled: true, settings_changed: true, upgraded: true,
};

it.each(Object.keys(ALL))("%s exists in crm_AuditLog_Action", (action) => {
  expect(Object.values(crm_AuditLog_Action)).toContain(action);
});
```

The `Record<AuditAction, true>` makes tsc fail if a future action is added to the type but not to this list.

- [ ] **Step 2: Run it.** `pnpm exec jest __tests__/audit-log/audit-actions.test.ts` → 2 failures (`imported`, `cancelled`).
- [ ] **Step 3: Implement.** In `prisma/schema.prisma` add `imported` and `cancelled` to `enum crm_AuditLog_Action` (after `upgraded`). Create the migration:

```sql
-- AlterEnum
ALTER TYPE "crm_AuditLog_Action" ADD VALUE 'imported';
ALTER TYPE "crm_AuditLog_Action" ADD VALUE 'cancelled';
```

Run `pnpm exec prisma generate`. Before `pnpm db:migrate`, check that host port 5433 is served by container `nextcrm-dev-postgres` (`docker ps --format '{{.Names}} {{.Ports}}' | grep 5433`); if it is not, skip the local migrate and say so in the report.
- [ ] **Step 4: Run it.** Same command → 14 passed.
- [ ] **Step 5: Commit.** `fix(audit): add imported and cancelled to crm_AuditLog_Action`

---

### Task 2: PluginData cleanup without rules (M2) and after-event ids under `select` (M4)

M2: `interceptWrite` takes the fast path when no enabled plugin has rules or after-actions for the entity, so `delete`/`deleteMany` never removes `PluginData` for plugins that only use `ctx.store.forRecord`. Spec § 9: rows are deleted whenever the record is hard-deleted.
M4: on `create` and upsert-create the after-event uses `row.id`, which is `undefined` when the caller's `select` omits `id`.

**Files:**
- Modify: `lib/plugins/prisma-extension.ts`
- Test: `lib/plugins/__tests__/prisma-extension.test.ts`

**Interfaces:**
- Produces: `InterceptDeps.hasInstalledPlugins(): Promise<boolean>` (new dep; true when the registry is non-empty and at least one `InstalledPlugin` row exists, any status).

- [ ] **Step 1: Write the failing tests.** Add `hasInstalledPlugins: jest.fn(async () => true),` to `mkDeps` defaults, then append:

```ts
it("cleans plugin data on hard delete when only stores are used (M2)", async () => {
  const deps = mkDeps({ hasRules: jest.fn(async () => false) });   // afterTargets default: []
  await interceptWrite({ model: "crm_Accounts", operation: "delete", args: { where: { id: "a1" } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.deleteRecordData).toHaveBeenCalledWith("account", ["a1"]);
  await interceptWrite({ model: "crm_Accounts", operation: "deleteMany", args: { where: {} }, query: async () => ({ count: 2 }) }, deps);
  expect(deps.deleteRecordData).toHaveBeenCalledWith("account", ["a1", "a2"]);
});

it("keeps the fast path for deletes when no plugin is installed", async () => {
  const deps = mkDeps({ hasRules: jest.fn(async () => false), hasInstalledPlugins: jest.fn(async () => false) });
  await interceptWrite({ model: "crm_Accounts", operation: "delete", args: { where: { id: "a1" } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.findExisting).not.toHaveBeenCalled();
  expect(deps.deleteRecordData).not.toHaveBeenCalled();
});

it("forces id into select so created after-events carry the record id (M4)", async () => {
  const deps = mkDeps({ afterTargets: jest.fn(async (_e: any, op: any) => (op === "created" ? ["p1"] : [])) });
  const query = jest.fn(async (args: any) => ({ id: args.select?.id ? "new1" : undefined, name: "N" }));
  await interceptWrite({ model: "crm_Accounts", operation: "create", args: { data: { name: "N" }, select: { name: true } }, query }, deps);
  expect(query.mock.calls[0][0].select).toEqual({ name: true, id: true });
  expect(deps.sendAfter).toHaveBeenCalledWith("p1", { entity: "account", operation: "created", recordId: "new1" });
});
```

Note: `fast path: no enabled rules or afters → no lookups` (existing test, an `update`) must keep passing.
- [ ] **Step 2: Run.** `pnpm exec jest lib/plugins/__tests__/prisma-extension.test.ts` → the three new tests fail.
- [ ] **Step 3: Implement** in `lib/plugins/prisma-extension.ts`:
  - Add `hasInstalledPlugins(): Promise<boolean>;` to `InterceptDeps`.
  - Replace the fast-path line with:

```ts
  const isHardDelete = p.operation === "delete" || p.operation === "deleteMany";
  if (!(await deps.hasRules(entity)) && !(await anyAfter()) && !(isHardDelete && (await deps.hasInstalledPlugins()))) return p.query(p.args);
```

  - Add near `isSoftDelete`:

```ts
// After-events need the record id even when the caller's select omits it.
const withId = (args: any) => (args.select && !args.select.id ? { ...args, select: { ...args.select, id: true } } : args);
```

  - `case "create"`: `const row = await p.query(withId({ ...p.args, data }));`
  - upsert-create branch: `const row = await p.query(withId({ ...p.args, create: data }));`
  - In `withPluginRules` deps add:

```ts
    hasInstalledPlugins: async () => {
      const { getRegistry } = await import("./registry");
      if (!getRegistry().length) return false;   // zero-plugin instances: no query
      return (await (await import("./state")).getPluginStates()).length > 0;
    },
```

- [ ] **Step 4: Run.** Same command → all pass.
- [ ] **Step 5: Commit.** `fix(plugins): clean PluginData on hard delete without rules; keep record id under select`

---

### Task 3: Settings warnings — missing required fields and once per process (M5)

`parseStoredSettings` drops a required field with no default and no stored value without any warning, and every `createPluginContext` (every rule call, panel render) repeats the same warn line, flooding `PluginLog`. The same applies to the undecryptable-secrets warning.

**Files:**
- Modify: `lib/plugins/settings.ts` (`parseStoredSettings`)
- Modify: `lib/plugins/context.ts`
- Test: `lib/plugins/__tests__/settings.test.ts`, `lib/plugins/__tests__/context.test.ts`

**Interfaces:**
- Consumes/produces: `parseStoredSettings(schema, stored, onWarn)` keeps its signature.

- [ ] **Step 1: Write the failing tests.** In `settings.test.ts`:

```ts
it("warns when a required field without default is missing (M5)", () => {
  const warn = jest.fn();
  const parsed = parseStoredSettings(schema, { days: 10 }, warn);   // url is required, absent
  expect(parsed.url).toBeUndefined();
  expect(warn).toHaveBeenCalledWith("Required settings missing: url", { fields: ["url"] });
});
```

In `context.test.ts` (the mocked state returns `settings: { days: "x" }`, which triggers the invalid-settings warn; `prismaBase.pluginLog.create` is the mock that receives log lines):

```ts
it("writes the same settings warning only once per process (M5)", async () => {
  const { prismaBase } = jest.requireMock("@/lib/prisma-base");
  prismaBase.pluginLog.create.mockClear();
  await createPluginContext({ plugin, actor: { type: "system" } as never });
  await createPluginContext({ plugin, actor: { type: "system" } as never });
  const warns = prismaBase.pluginLog.create.mock.calls.filter((c: any[]) => c[0].data.level === "warn");
  expect(warns).toHaveLength(1);
});
```

If an earlier test in `context.test.ts` already created a context for the same plugin (so the warning was already written once), give this test its own plugin id (copy `plugin` with `definition: { ...plugin.definition, id: "demo-warn" }`).
- [ ] **Step 2: Run.** `pnpm exec jest lib/plugins/__tests__/settings.test.ts lib/plugins/__tests__/context.test.ts` → both new tests fail.
- [ ] **Step 3: Implement.** In `parseStoredSettings`:

```ts
  const missing: string[] = [];
  for (const [key, fieldSchema] of Object.entries(schema.shape) as [string, z.ZodType][]) {
    const res = fieldSchema.safeParse(input[key]);
    if (res.success) { out[key] = res.data; continue; }
    const fallback = fieldSchema.safeParse(undefined);
    if (fallback.success) out[key] = fallback.data;
    else if (input[key] === undefined) missing.push(key);
    if (input[key] !== undefined) invalid.push(key);
  }
  if (invalid.length) onWarn(`Stored settings invalid; using defaults for: ${invalid.join(", ")}`, { fields: invalid });
  if (missing.length) onWarn(`Required settings missing: ${missing.join(", ")}`, { fields: missing });
```

In `context.ts`, at module level:

```ts
// Settings/secrets warnings repeat on every context build; write each one once per process.
const warned = new Set<string>();
```

and inside `createPluginContext`, replace the three `log.warn` callbacks with `warnOnce`:

```ts
  const warnOnce = (m: string, c?: Record<string, unknown>) => {
    const k = `${definition.id}|${m}`;
    if (warned.has(k)) return;
    warned.add(k);
    log.warn(m, c as never);
  };
  const settings = parseStoredSettings(definition.settings, state?.settings, warnOnce);
  const rawSecrets = decryptSecrets(state?.secrets ?? null, (m) => warnOnce(m));
  const secrets = parseStoredSettings(definition.secrets, rawSecrets, warnOnce);
```

- [ ] **Step 4: Run.** Same command → all pass.
- [ ] **Step 5: Commit.** `fix(plugins): warn on missing required settings, once per process`

---

### Task 4: `ctx.http` guard — own env flag and re-checked redirects (M7)

`assertPublicHost` returns early when `MAIL_ALLOW_PRIVATE_HOSTS=true`, which also disables the plugin guard regardless of `PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS`. Redirects are followed by `fetch` without re-checking the target host.

**Files:**
- Modify: `lib/net/host-guard.ts`
- Modify: `lib/plugins/http.ts`
- Test: create `lib/plugins/__tests__/http.test.ts`; existing host-guard tests must keep passing (`grep -rl "assertPublicHost" __tests__ lib --include=*.test.ts`).

**Interfaces:**
- Produces: `assertPublicHost(host: string, allowPrivate = process.env.MAIL_ALLOW_PRIVATE_HOSTS === "true")` — mail callers unchanged.

- [ ] **Step 1: Write the failing tests** in `lib/plugins/__tests__/http.test.ts`:

```ts
const lookup = jest.fn();
jest.mock("node:dns/promises", () => ({ lookup: (...a: unknown[]) => lookup(...a) }));
import { createHttp } from "@/lib/plugins/http";
import { HostNotAllowedError } from "@/lib/net/host-guard";

const log = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; delete process.env.MAIL_ALLOW_PRIVATE_HOSTS; delete process.env.PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS; jest.clearAllMocks(); });

it("MAIL_ALLOW_PRIVATE_HOSTS does not open the plugin guard (M7)", async () => {
  process.env.MAIL_ALLOW_PRIVATE_HOSTS = "true";
  global.fetch = jest.fn() as never;
  await expect(createHttp(log).fetch("http://127.0.0.1/x")).rejects.toBeInstanceOf(HostNotAllowedError);
  expect(global.fetch).not.toHaveBeenCalled();
});

it("re-checks every redirect target (M7)", async () => {
  lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  global.fetch = jest.fn(async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } })) as never;
  await expect(createHttp(log).fetch("https://example.com/a")).rejects.toBeInstanceOf(HostNotAllowedError);
  expect((global.fetch as jest.Mock).mock.calls[0][1].redirect).toBe("manual");
});

it("follows public redirects up to 5 hops", async () => {
  lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/b" } }))
    .mockResolvedValueOnce(new Response("ok", { status: 200 }));
  global.fetch = fetchMock as never;
  const res = await createHttp(log).fetch("https://example.com/a");
  expect(res.status).toBe(200);
  expect(fetchMock.mock.calls[1][0]).toBe("https://example.com/b");
});
```

- [ ] **Step 2: Run.** `pnpm exec jest lib/plugins/__tests__/http.test.ts` → first two fail.
- [ ] **Step 3: Implement.** `lib/net/host-guard.ts`:

```ts
export async function assertPublicHost(
  host: string,
  allowPrivate = process.env.MAIL_ALLOW_PRIVATE_HOSTS === "true",
): Promise<{ address: string; hostname: string }> {
  if (allowPrivate) {
    return { address: host, hostname: host };
  }
```

(rest unchanged). `lib/plugins/http.ts`:

```ts
import type { PluginHttp, PluginLogger } from "@nextcrm/plugin-sdk";
import { assertPublicHost } from "@/lib/net/host-guard";

const MAX_REDIRECTS = 5;

export function createHttp(log: PluginLogger): PluginHttp {
  return {
    async fetch(url, init = {}) {
      const { timeoutMs = 15_000, ...rest } = init;
      const allowPrivate = process.env.PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS === "true";
      const started = Date.now();
      let current = new URL(url);
      try {
        for (let hop = 0; ; hop++) {
          await assertPublicHost(current.hostname, allowPrivate);
          const res = await fetch(current.toString(), { ...rest, redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
          const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
          if (!location) {
            log.debug("http", { url: `${current.origin}${current.pathname}`, status: res.status, ms: Date.now() - started });
            return res;
          }
          if (hop >= MAX_REDIRECTS) throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
          current = new URL(location, current);
        }
      } catch (e) {
        log.warn("http failed", { url: `${current.origin}${current.pathname}`, ms: Date.now() - started, error: String(e) });
        throw e;
      }
    },
  };
}
```

- [ ] **Step 4: Run** the new test file plus every existing test file that references `assertPublicHost` → all pass.
- [ ] **Step 5: Commit.** `fix(plugins): own private-host flag and re-checked redirects for ctx.http`

---

### Task 5: `notify` recipients (M8)

`sendPluginNotification` mails PENDING/INACTIVE users, puts all recipients in one `to` (they see each other's addresses) and compares the raw DB role without `mapLegacyRole`.

**Files:**
- Modify: `lib/plugins/notify.ts`
- Test: create `lib/plugins/__tests__/notify.test.ts`

**Interfaces:** `sendPluginNotification(pluginId, input)` unchanged.

- [ ] **Step 1: Write the failing test:**

```ts
const findMany = jest.fn();
const send = jest.fn();
jest.mock("@/lib/prisma-base", () => ({ prismaBase: { users: { findMany: (...a: unknown[]) => findMany(...a) } } }));
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn(async () => ({ emails: { send } })) }));
import { sendPluginNotification } from "@/lib/plugins/notify";

it("mails active users matching role (legacy roles mapped) or id, one message each (M8)", async () => {
  findMany.mockResolvedValue([
    { id: "u1", email: "a@x.cz", role: "admin" },
    { id: "u2", email: "b@x.cz", role: "account_admin" },   // legacy value; mapLegacyRole decides its role
    { id: "u3", email: "c@x.cz", role: "user" },
  ]);
  await sendPluginNotification("demo", { roles: ["admin"], userIds: ["u3"], subject: "S", text: "T" });
  expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userStatus: "ACTIVE" } }));
  const recipients = send.mock.calls.map((c) => c[0].to);
  expect(recipients.every((r) => typeof r === "string")).toBe(true);
  expect(recipients).toContain("a@x.cz");
  expect(recipients).toContain("c@x.cz");
});
```

Before writing the `u2` expectation, read `LEGACY_MAP` in `lib/authz/roles.ts`: pick a legacy value that maps to `admin` and add `expect(recipients).toContain("b@x.cz")`; replace `"account_admin"` with that value. If no legacy value maps to `admin`, drop `u2`.
- [ ] **Step 2: Run.** `pnpm exec jest lib/plugins/__tests__/notify.test.ts` → fails.
- [ ] **Step 3: Implement:**

```ts
import type { NotifyInput } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import resendHelper from "@/lib/resend";
import { mapLegacyRole } from "@/lib/authz/roles";

export async function sendPluginNotification(pluginId: string, input: NotifyInput): Promise<void> {
  const users = await prismaBase.users.findMany({ where: { userStatus: "ACTIVE" }, select: { id: true, email: true, role: true } });
  const roles = new Set<string>(input.roles ?? []);
  const ids = new Set(input.userIds ?? []);
  const to = users
    .filter((u) => u.email && (ids.has(u.id) || roles.has(mapLegacyRole(u.role))))
    .map((u) => u.email);
  if (!to.length) return;
  const resend = await resendHelper();
  // One message per recipient: recipients must not see each other's addresses.
  for (const email of to) {
    await resend.emails.send({
      from: `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: input.subject,
      text: input.text,
    });
  }
}
```

(`pluginId` stays unused as before.)
- [ ] **Step 4: Run.** → pass.
- [ ] **Step 5: Commit.** `fix(plugins): notify only active users, one mail per recipient, mapped roles`

---

### Task 6: `ctx.data` read filters — scalar fields only, no password, `take` capped (M9 residual)

`where`/`orderBy` from plugins reach Prisma unchecked, so a plugin can filter through relations (e.g. `assigned_to_user: { password: { startsWith: "$2" } }`) or directly on `users.password` and guess hash prefixes. `take` is defaulted to 100 but a larger value passes through.

**Files:**
- Modify: `lib/plugins/data-api.ts`
- Modify: `docs/plugins/README.md` (document the filter rule, the 100-row cap, and the `source` field on `crm/*.saved` events added in v0)
- Test: `lib/plugins/__tests__/data-api.test.ts`

**Interfaces:**
- Produces: `ctx.data.<entity>.find()` throws `Error("Invalid filter field: <key>")` for a non-scalar or forbidden key.

- [ ] **Step 1: Write the failing tests** (append to `data-api.test.ts`; its `@/lib/prisma` mock has `users` and `crm_Accounts`):

```ts
it("refuses relation filters and password filters (M9)", async () => {
  const api = createDataApi("demo", ["accounts:read", "users:read"]);
  await expect(api.accounts.find({ where: { assigned_to_user: { password: { startsWith: "$2" } } } } as never)).rejects.toThrow("Invalid filter field: assigned_to_user");
  await expect(api.users.find({ where: { password: { startsWith: "$2" } } } as never)).rejects.toThrow("Invalid filter field: password");
  await expect(api.users.find({ orderBy: { password: "asc" } } as never)).rejects.toThrow("Invalid filter field: password");
  await expect(api.accounts.find({ where: { OR: [{ name: "A" }, { assigned_to_user: { email: "x" } }] } } as never)).rejects.toThrow("Invalid filter field: assigned_to_user");
  expect(delegate.findMany).not.toHaveBeenCalled();
});

it("allows scalar filters with operators and caps take at 100 (M9)", async () => {
  const api = createDataApi("demo", ["accounts:read"]);
  await api.accounts.find({ where: { name: { contains: "Acme" }, AND: [{ status: "Active" }] }, orderBy: [{ createdAt: "desc" }], take: 5000 } as never);
  const arg = delegate.findMany.mock.calls[0][0];
  expect(arg.take).toBe(100);
  expect(arg.where).toEqual({ name: { contains: "Acme" }, AND: [{ status: "Active" }] });
});
```

Check that `status` is a scalar field of `crm_Accounts` in `prisma/schema.prisma`; if not, use another scalar field.
- [ ] **Step 2: Run.** `pnpm exec jest lib/plugins/__tests__/data-api.test.ts` → new tests fail.
- [ ] **Step 3: Implement** in `data-api.ts`:

```ts
import { Prisma } from "@prisma/client";

const LOGICAL = new Set(["AND", "OR", "NOT"]);
const MAX_TAKE = 100;

// Plugins may filter and sort only on their model's own scalar fields, never on password.
function scalarFields(model: string): Set<string> {
  const name = `${model[0].toUpperCase()}${model.slice(1)}ScalarFieldEnum` as keyof typeof Prisma;
  const fields = Object.values((Prisma[name] ?? {}) as Record<string, string>);
  return new Set(fields.filter((f) => f !== "password"));
}

function assertFilter(value: unknown, allowed: Set<string>): void {
  if (Array.isArray(value)) { value.forEach((v) => assertFilter(v, allowed)); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, inner] of Object.entries(value)) {
    if (LOGICAL.has(key)) { assertFilter(inner, allowed); continue; }
    if (!allowed.has(key)) throw new Error(`Invalid filter field: ${key}`);
  }
}
```

In `read(...).find`:

```ts
    async find(args: FindArgs = {}) {
      need(perm);
      const { where, orderBy, take, skip } = args;
      const allowed = scalarFields(model);
      assertFilter(where, allowed);
      assertFilter(orderBy, allowed);
      const safe = { where, orderBy, take: Math.min(take ?? MAX_TAKE, MAX_TAKE), skip };
      return (await (await db())[model].findMany(model === "users" ? { ...safe, omit: { password: true } } : safe)) as RecordData[];
    },
```

Update the comment above `read` to say filters are limited to scalar fields. Verify `Prisma.UsersScalarFieldEnum`, `Prisma.Crm_AccountsScalarFieldEnum`, `Prisma.Crm_ActivitiesScalarFieldEnum`, `Prisma.Crm_ProductsScalarFieldEnum` exist (`node -e "const {Prisma}=require('@prisma/client');console.log(!!Prisma.UsersScalarFieldEnum)"`). If `scalarFields` returns an empty set for any model used in `createDataApi`, the test suite must catch it: add one assertion per model in the second test, or a dedicated test calling `find({ where: { id: "x" } })` on every read API.

`docs/plugins/README.md`: in the `ctx.data` section add: filters (`where`, `orderBy`) may use only the model's own scalar fields plus `AND`/`OR`/`NOT`, never `password`; relation filters throw `Invalid filter field`; `take` is capped at 100. In the events section add: `crm/*.saved` events carry `source: <pluginId>` when the write came from a plugin's `ctx.data`, and a plugin's own `on` handlers skip events it caused.
- [ ] **Step 4: Run.** → pass.
- [ ] **Step 5: Commit.** `fix(plugins): scalar-only filters and capped take for ctx.data reads`

---

### Task 7: Lifecycle robustness (M12) and non-blocking boot upgrade (M1)

M12: if `inngest.send("plugin/installed")` fails after the row is created, the plugin stays ENABLED without `onInstall` and a retry says "already installed". `DISABLED` set after an `onInstall` or `onUpgrade` failure is not audited. The install job throws in its own catch when the row was uninstalled meanwhile (`update` on a missing row).
M1: `instrumentation.ts` awaits `runPluginUpgrades()` (up to 10 min transaction timeout), so the server serves nothing until all `onUpgrade` hooks finish.

**Files:**
- Modify: `lib/plugins/lifecycle.ts` (`installPlugin`)
- Modify: `lib/plugins/inngest.ts` (`pluginInstallFunction` catch)
- Modify: `lib/plugins/upgrade.ts` (catch)
- Modify: `instrumentation.ts`
- Test: `lib/plugins/__tests__/lifecycle.test.ts`, `lib/plugins/__tests__/inngest.test.ts`, `lib/plugins/__tests__/upgrade.test.ts`, create `__tests__/plugins/instrumentation.test.ts`

**Interfaces:** none new. Audit rows: `{ entityType: "plugin", entityId: <id>, action: "disabled", changes: null, userId: null }` for automatic disables.

- [ ] **Step 1: Write the failing tests.**

`lifecycle.test.ts`:

```ts
it("rolls back the install when the install event cannot be sent (M12)", async () => {
  getPluginState.mockResolvedValue(undefined);
  (inngest.send as jest.Mock).mockRejectedValueOnce(new Error("inngest down"));
  await expect(installPlugin("demo", "u1", { settings: {}, secrets: { apiKey: "k" } })).rejects.toThrow("try again");
  expect(db.installedPlugin.delete).toHaveBeenCalledWith({ where: { id: "demo" } });
  const { writeAuditLog } = jest.requireMock("@/lib/audit-log");
  expect(writeAuditLog).not.toHaveBeenCalledWith(expect.objectContaining({ action: "installed" }));
});
```

`inngest.test.ts` (its `@/lib/prisma-base` mock: add `updateMany: jest.fn(async () => ({ count: 0 }))` to `installedPlugin`, and add `jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));` before the imports):

```ts
it("install job: onInstall failure on an already-uninstalled plugin does not throw and is audited (M12)", async () => {
  installing.gone = { ...plugin, definition: { ...plugin.definition, id: "gone", onInstall: async () => { throw new Error("boom"); } } };
  const res = await (pluginInstallFunction as any).handler({ event: { data: { pluginId: "gone" } } });
  expect(res).toEqual({ status: "failed" });
  expect((prismaBase.installedPlugin as any).updateMany).toHaveBeenCalledWith({ where: { id: "gone" }, data: { status: "DISABLED" } });
  const { writeAuditLog } = jest.requireMock("@/lib/audit-log");
  expect(writeAuditLog).toHaveBeenCalledWith({ entityType: "plugin", entityId: "gone", action: "disabled", changes: null, userId: null });
});
```

Adapt the handler invocation to how the existing install-job test in `inngest.test.ts` calls it (the mock `createFunction` returns `{ cfg, handler }`), and update the existing onInstall-failure test's expectation from `update` to `updateMany`.

`upgrade.test.ts` — extend the first test:

```ts
  const { writeAuditLog } = jest.requireMock("@/lib/audit-log");
  expect(writeAuditLog).toHaveBeenCalledWith({ entityType: "plugin", entityId: "broken", action: "disabled", changes: null, userId: null });
```

`__tests__/plugins/instrumentation.test.ts`:

```ts
let release: () => void = () => {};
const runPluginUpgrades = jest.fn(() => new Promise<void>((r) => { release = r; }));
jest.mock("@/lib/plugins/upgrade", () => ({ runPluginUpgrades: () => runPluginUpgrades() }));
import { register } from "@/instrumentation";

it("does not block boot on plugin upgrades (M1)", async () => {
  process.env.NEXT_RUNTIME = "nodejs";
  delete process.env.SKIP_ENV_VALIDATION;
  const done = jest.fn();
  await register().then(done);   // resolves although the upgrade promise is still pending
  expect(runPluginUpgrades).toHaveBeenCalled();
  expect(done).toHaveBeenCalled();
  release();
});
```

If `@/instrumentation` does not resolve under jest, import it by relative path (`../../instrumentation`).
- [ ] **Step 2: Run.** `pnpm exec jest lib/plugins/__tests__/lifecycle.test.ts lib/plugins/__tests__/inngest.test.ts lib/plugins/__tests__/upgrade.test.ts __tests__/plugins/instrumentation.test.ts` → new assertions fail (the instrumentation test times out; that is the RED).
- [ ] **Step 3: Implement.**

`lifecycle.ts` `installPlugin`, after `create` + `invalidatePluginCache()`:

```ts
  try {
    await inngest.send({ name: "plugin/installed", data: { pluginId: id } });
  } catch (e) {
    // Without the install event onInstall never runs; undo so the admin can retry.
    await prismaBase.installedPlugin.delete({ where: { id } });
    invalidatePluginCache();
    writePluginLog(id, "error", `Install event could not be sent: ${String(e)}`);
    throw new Error("Plugin installation could not be started; please try again.");
  }
  await audit(id, userId, "installed");
```

(the `audit(..., "installed")` call moves after the send.)

`inngest.ts` `pluginInstallFunction` catch:

```ts
    } catch (e) {
      writePluginLog(plugin.definition.id, "error", `onInstall failed: ${String(e)}`);
      // updateMany: the plugin may have been uninstalled while the job ran.
      await prismaBase.installedPlugin.updateMany({ where: { id: plugin.definition.id }, data: { status: "DISABLED" } });
      await writeAuditLog({ entityType: "plugin", entityId: plugin.definition.id, action: "disabled", changes: null, userId: null });
      invalidatePluginCache();
      return { status: "failed" };
    }
```

with `import { writeAuditLog } from "@/lib/audit-log";`.

`upgrade.ts` catch: after the `DISABLED` update add
`await writeAuditLog({ entityType: "plugin", entityId: row.id, action: "disabled", changes: null, userId: null });`

`instrumentation.ts`:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_ENV_VALIDATION === "1") return; // docker build stage has no DB
  const { runPluginUpgrades } = await import("@/lib/plugins/upgrade");
  // Not awaited: onUpgrade hooks may take minutes and must not block serving. Replicas are
  // serialized by the advisory lock; until a plugin's upgrade finishes it runs on its old stored version.
  void runPluginUpgrades().catch((e) => console.error("[PLUGIN_UPGRADE]", e));
}
```

In the spec (`docs/superpowers/specs/2026-10-04-plugin-system-design.md`), in the lifecycle section where boot upgrades are described, add one sentence: upgrades run in the background after boot; the server does not wait for them.
- [ ] **Step 4: Run** the four test files → pass.
- [ ] **Step 5: Commit.** `fix(plugins): roll back failed installs, audit automatic disables, non-blocking boot upgrades`

---

### Task 8: Contract checks for Inngest function ids and cron syntax (M10)

A slug collision between Inngest function ids (`plugin-<id>-cron-<slug>`, `plugin-<id>-on-<slug>`, `plugin-<id>-after`) or an invalid cron expression fails registration of the whole `serve()` endpoint, taking every core Inngest function down. The contract test must catch both before a plugin ships.

**Files:**
- Modify: `lib/plugins/inngest.ts` (extract id builders)
- Modify: `__tests__/plugins/contract.test.ts`

**Interfaces:**
- Produces: `export function pluginFunctionIds(plugin: RegisteredPlugin): string[]` in `lib/plugins/inngest.ts`; `buildPluginFunctions` uses the same id builders.
- Produces: `export function registryProblems(registry: RegisteredPlugin[]): string[]` in `__tests__/plugins/contract.test.ts`.

- [ ] **Step 1: Write the failing tests** in `contract.test.ts`:

```ts
import { pluginFunctionIds } from "@/lib/plugins/inngest";

const CRON = /^(TZ=\S+\s+)?([\d*\/,\-A-Za-z?LW#]+\s+){4}[\d*\/,\-A-Za-z?LW#]+$/;

export function registryProblems(registry: RegisteredPlugin[]): string[] {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const p of registry) {
    for (const fnId of pluginFunctionIds(p)) {
      const other = seen.get(fnId);
      if (other) problems.push(`duplicate Inngest function id ${fnId} (${other}, ${p.definition.id})`);
      else seen.set(fnId, p.definition.id);
    }
    for (const c of p.definition.extensions.crons) {
      if (!CRON.test(c.schedule.trim())) problems.push(`${p.definition.id}: invalid cron "${c.schedule}" (${c.id})`);
    }
  }
  return problems;
}

it("registry has unique Inngest function ids and valid crons", () => expect(registryProblems(getRegistry())).toEqual([]));

it("registry check catches id collisions and bad crons (M10)", () => {
  const mk = (id: string, ext: (x: any) => void): RegisteredPlugin => ({
    source: "public", messages: {},
    definition: definePlugin({ id, name: id, version: "1.0.0", sdk: "^0.1.0", description: "", permissions: [], extensions: ext }),
  });
  const a = mk("a", (x) => { x.cron("x-after", "0 3 * * *", () => {}); x.cron("X After", "every day", () => {}); });
  const b = mk("a-cron-x", (x) => x.after("account", "created", () => {}));
  expect(registryProblems([a, b])).toEqual([
    "duplicate Inngest function id plugin-a-cron-x-after (a, a)",
    "duplicate Inngest function id plugin-a-cron-x-after (a, a-cron-x)",
    'a: invalid cron "every day" (X After)',
  ]);
});
```

If `definePlugin` rejects one of these ids or cron ids by its own validation, adjust the fixture ids so both collision kinds (within one plugin, across plugins) are still produced, and update the expected strings.
- [ ] **Step 2: Run.** `pnpm exec jest __tests__/plugins/contract.test.ts` → fails (`pluginFunctionIds` is not exported).
- [ ] **Step 3: Implement** in `inngest.ts`:

```ts
const cronFnId = (pluginId: string, cronId: string) => `plugin-${pluginId}-cron-${slug(cronId)}`;
const onFnId = (pluginId: string, event: string) => `plugin-${pluginId}-on-${slug(event)}`;
const afterFnId = (pluginId: string) => `plugin-${pluginId}-after`;

export function pluginFunctionIds(plugin: RegisteredPlugin): string[] {
  const { id, extensions } = plugin.definition;
  return [
    ...extensions.crons.map((c) => cronFnId(id, c.id)),
    ...extensions.events.map((e) => onFnId(id, e.event)),
    ...(extensions.afters.length ? [afterFnId(id)] : []),
  ];
}
```

and replace the three inline id template strings in `buildPluginFunctions` with `cronFnId(id, cron.id)`, `onFnId(id, ev.event)`, `afterFnId(id)`. Add a line to `docs/plugins/README.md` (authoring checklist): the contract test fails on duplicate Inngest function ids and invalid cron expressions.
- [ ] **Step 4: Run** `contract.test.ts` and `lib/plugins/__tests__/inngest.test.ts` → pass.
- [ ] **Step 5: Commit.** `test(plugins): contract check for Inngest function id collisions and cron syntax`

---

### Task 9: Company registry lookup polish (M14)

`loadFromRegistry` in the new-account form has no `try/finally`, so the button stays disabled if the action throws; `lookupCompany` builds the plugin context outside its `try`; `billing_country` receives the ISO code (`CZ`) while the field is free text that users fill with country names.

**Files:**
- Modify: `actions/crm/accounts/lookup-company.ts`
- Modify: `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx` (`loadFromRegistry`, ~line 84)
- Test: `actions/crm/accounts/__tests__/lookup-company.test.ts`

**Interfaces:** `lookupCompany(country, registrationNumber)` unchanged.

- [ ] **Step 1: Write the failing test** in `lookup-company.test.ts`, following that file's existing mocks:

```ts
it("returns the not-found error when the plugin context cannot be built (M14)", async () => {
  // make the mocked createPluginContext reject once
  createPluginContextMock.mockRejectedValueOnce(new Error("state unavailable"));
  await expect(lookupCompany("cz", "12345678")).resolves.toEqual({ error: "registryNotFound" });
});
```

Use the file's actual mock names and the translation value its other not-found tests expect.
- [ ] **Step 2: Run.** `pnpm exec jest actions/crm/accounts/__tests__/lookup-company.test.ts` → the new test fails (rejection escapes).
- [ ] **Step 3: Implement.** `lookup-company.ts`:

```ts
  let ctx: Awaited<ReturnType<typeof createPluginContext>> | undefined;
  try {
    ctx = await createPluginContext({ plugin: found.plugin as never, actor: { type: "user", userId: user.id, role: user.role } });
    const data = await found.provider.lookup(registrationNumber.trim(), cc, ctx);
    return data ? { data } : { error: t("registryNotFound") };
  } catch (e) {
    if (ctx) ctx.log.error(`Registry lookup failed: ${String(e)}`);
    else console.error("[REGISTRY_LOOKUP]", e);
    return { error: t("registryNotFound") };
  }
```

`NewAccountForm.tsx`: wrap the call:

```ts
    setLookingUp(true);
    let res: Awaited<ReturnType<typeof lookupCompany>>;
    try {
      res = await lookupCompany(registryCountry, number);
    } catch {
      res = { error: p("registryNotFound") };
    } finally {
      setLookingUp(false);
    }
```

and replace `form.setValue("billing_country", d.country);` with a localized country name:

```ts
    form.setValue("billing_country", new Intl.DisplayNames([locale], { type: "region" }).of(d.country) ?? d.country);
```

where `locale` comes from `useLocale()` (`import { useLocale } from "next-intl";`), unless the component already has the locale in scope.
- [ ] **Step 4: Run** the test file and `pnpm exec tsc --noEmit` → pass/clean.
- [ ] **Step 5: Commit.** `fix(accounts): registry lookup survives context errors; country name instead of ISO code`

---

## Out of scope (stay deferred)

M6 (rule-rejection messages outside the 12 CRUD actions), M11 (audit rows for `ctx.data` writes), M13 (admin refresh; did not reproduce), M15 (client-side plugin UI errors to `PluginLog`), DNS-rebinding gap between the guard's lookup and `fetch` (documented in v0). They are listed in the PR description for this branch.
