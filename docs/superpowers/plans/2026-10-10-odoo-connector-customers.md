# Odoo connector, part 1 (connection and customers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A generic `odoo-connector` plugin that imports Odoo customers as accounts and their people as contacts, keeps them current by polling, and never writes to Odoo.

**Architecture:**
- A small, generic SDK addition (0.2.2): plugin **admin actions**, buttons the host renders on the plugin's admin page and runs with the plugin's context. "Test connection" and "Sync now" need them; nothing else in the platform lets a plugin screen trigger work.
- Plugin layers:
  - `odoo.ts`, a JSON-2 client behind an `OdooClient` interface;
  - `map.ts` and `match.ts`, pure partner → account/contact mapping and matching;
  - `sync.ts`, first import, incremental runs, cursor, lock, conflicts, alerts;
  - `ui/*`, the admin section, the Needs-owner page and the account panel.

**Tech Stack:** Next.js 16, Prisma 7, `@nextcrm/plugin-sdk` (in-repo), zod 4, jest.

**Spec:** `docs/superpowers/specs/2026-10-10-odoo-connector-customers-design.md`

## Global Constraints

- Nothing written to Odoo: only `search_read`, `read`, `fields_get`, `res.users/context_get` and `/web/webclient/version_info`.
- Odoo wins for the synced account fields (spec § 3.4 table); a sync never changes an existing account's owner; CRM-only fields are never touched.
- Owner on create: Odoo salesperson's email → ACTIVE CRM user; else none and the Needs-owner list.
- `dryRun` defaults to true: logs would-be writes, writes nothing (no CRM rows, no links, no cursor).
- Generic: no OXO/GIPS names, ids or values in code, tests or migrations; all plugin text in `plugins/odoo-connector/messages/{en,cz,de,uk}.json` with identical keys (the contract test enforces this).
- SDK 0.2.1 → 0.2.2 (additive). Plugin `sdk: "^0.2.2"`.
- **Fresh worktree setup:** `pnpm install --frozen-lockfile --prefer-offline`, then `DATABASE_URL=postgresql://x:x@localhost:5432/x pnpm exec prisma generate`.
- **Known baseline failures** (ignore): the 4 suites `enrich-contact-job`, `enrich-target-job`, `google-sync-classify`, `invoices/lifecycle` (6 tests).
- **CI runs `pnpm lint`;** tsc clean after every task. After adding the plugin: `pnpm plugins:generate` (commits `lib/plugins/plugins.generated.ts`).
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Never `git add -A`. `git checkout -- AGENTS.md` before committing after `next dev`.

## Rulings (decided while planning)

1. **Admin actions are a core addition the spec did not list.** Spec § 4 asks for "Test connection" and "Sync now" buttons, but plugin screens are server components without a way to run plugin code on click, and only the host can build a plugin context (it holds the decrypted secrets). The smallest generic answer is `x.adminAction({ id, label, handler })`, rendered and executed by the host for admins on enabled plugins. Cost if wrong: one small SDK API to maintain.
2. **The cron runs every 5 minutes and syncs when `syncMinutes` have passed** (as spec § 2.1 says), measured from the last run's start, with 30 s of slack so a 15-minute setting does not slip to 20.
3. **Fields are intersected with `res.partner/fields_get`.** Odoo versions add and drop partner fields (e.g. `mobile`); requesting a missing field fails the whole call. The client asks which of the wanted fields exist once per run.
4. **Country codes come from `res.country`** once per run (`country_id` is `[id, name]` in `search_read`).
5. **Number candidates are found with `company_id in [raw, normalized, normalized without leading zeros]`** and compared after normalising with the *partner's* country; existing accounts may store the country as a name, and the same company has one country.
6. **People are synced only under linked customers**, so a dry run (which links nothing) reports customers only.
7. **`onInstall` never throws:** a wrong key or missing setting on install is logged; the first good cron run imports (spec § 3.3).

## Review Focus

1. **The same Odoo customer is synced twice** (two runs, a retry, an overlapping cursor window): no duplicate account, no duplicate contact. Tests in Task 5 (idempotent re-run) and Task 6.
2. **Two CRM accounts share the customer's registration number:** no link, a conflict, no update to either account. Test in Task 4 and Task 5.
3. **A CRM user edits a synced field** (e.g. the name): the edit stays until the partner next changes in Odoo; then the sync writes Odoo's value over it (only partners changed since the cursor are read). An empty Odoo value never clears a filled CRM field (Pavel, 2026-10-10). Pinned by a test in Task 5 so the behaviour is deliberate.
4. **Odoo rejects the key mid-run** (401 on page 3): the run stops, nothing after page 2 is processed, the cursor stays at the last good page, the log says why. Test in Task 5.
5. **A CRM account linked to a partner is deleted in the CRM:** the next sync does not crash and does not resurrect it silently — it matches again (number/VAT/new). Test in Task 5.

---

## File Structure

```
packages/plugin-sdk/src/{types,define,version}.ts                 admin actions, SDK 0.2.2
app/[locale]/(routes)/admin/plugins/_actions/plugins.ts           runPluginAdminActionAction
app/[locale]/(routes)/admin/plugins/_components/PluginAdminActions.tsx
app/[locale]/(routes)/admin/plugins/[pluginId]/page.tsx           render the buttons
__tests__/plugins/contract.test.ts                                action labels must exist in en
plugins/odoo-connector/settings.ts                                settings, secrets, Ctx
plugins/odoo-connector/store.ts                                   keys and stored shapes
plugins/odoo-connector/odoo.ts                                    OdooClient, jsonClient, errors, testConnection
plugins/odoo-connector/map.ts                                     OdooPartner, accountFields, contactFields, splitName, changedFields
plugins/odoo-connector/match.ts                                   normalizeNumber, normalizeVat, matchAccount
plugins/odoo-connector/sync.ts                                    runSync, scheduledSync, summaryText
plugins/odoo-connector/plugin.ts                                  definition
plugins/odoo-connector/ui/{AdminSection,NeedsOwnerPage,AccountPanel}.tsx
plugins/odoo-connector/messages/{en,cz,de,uk}.json
plugins/odoo-connector/__tests__/*.test.ts, __tests__/fake-odoo.ts
lib/plugins/plugins.generated.ts                                  regenerated
apps/docs/content/docs/admins/plugins/odoo-connector.mdx, admins/plugins/meta.json, index.mdx
```

---

### Task 1: SDK admin actions (0.2.2)

**Files:**
- Modify: `packages/plugin-sdk/src/types.ts`, `packages/plugin-sdk/src/define.ts`, `packages/plugin-sdk/src/version.ts`
- Modify: `app/[locale]/(routes)/admin/plugins/_actions/plugins.ts`, `app/[locale]/(routes)/admin/plugins/[pluginId]/page.tsx`
- Create: `app/[locale]/(routes)/admin/plugins/_components/PluginAdminActions.tsx`
- Modify: `__tests__/plugins/contract.test.ts`; version strings in `packages/plugin-sdk/__tests__/version.test.ts`, `lib/plugins/__tests__/data-api-activities.test.ts`, `lib/plugins/__tests__/data-api-orders.test.ts`, `lib/plugins/__tests__/lifecycle.test.ts`
- Test: `packages/plugin-sdk/__tests__/define.test.ts`, `lib/plugins/__tests__/admin-actions.test.ts`

**Interfaces:**
- Produces: `AdminActionRegistration { id: string; label: string; handler: (ctx: PluginContext<any, any>) => Promise<string | void> }`; `PluginExtensions.adminActions`; `ExtensionBuilder.adminAction(...)`; server action `runPluginAdminActionAction(pluginId: string, actionId: string): Promise<{ ok: boolean; message?: string; error?: string }>`.

- [ ] **Step 1: Write the failing tests**

Append to `packages/plugin-sdk/__tests__/define.test.ts`:
```ts
it("registers admin actions with unique ids", () => {
  const def = definePlugin({ ...base, extensions: (x) => x.adminAction({ id: "sync", label: "admin.sync", handler: async () => "done" }) });
  expect(def.extensions.adminActions.map((a) => [a.id, a.label])).toEqual([["sync", "admin.sync"]]);
  expect(() => definePlugin({ ...base, extensions: (x) => { x.adminAction({ id: "a", label: "l", handler: async () => {} }); x.adminAction({ id: "a", label: "l", handler: async () => {} }); } })).toThrow("Duplicate admin action id");
});
```
`lib/plugins/__tests__/admin-actions.test.ts`:
```ts
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("@/lib/prisma", () => ({ prismadb: { users: { findUnique: jest.fn() } } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next-intl/server", () => ({ getLocale: jest.fn(async () => "en") }));
jest.mock("@/lib/plugins/lifecycle", () => ({ installPlugin: jest.fn(), savePluginSettings: jest.fn(), setPluginEnabled: jest.fn(), uninstallPlugin: jest.fn() }));
jest.mock("@/lib/plugins/state", () => ({ getPluginState: jest.fn() }));
jest.mock("@/lib/plugins/settings", () => ({ decryptSecrets: jest.fn() }));
jest.mock("@/lib/plugins/registry", () => ({ findPlugin: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({ id: "ctx" })) }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getPluginState } from "@/lib/plugins/state";
import { findPlugin } from "@/lib/plugins/registry";
import { writePluginLog } from "@/lib/plugins/log";
import { runPluginAdminActionAction } from "@/app/[locale]/(routes)/admin/plugins/_actions/plugins";

const as = (role: string) => {
  (getSession as jest.Mock).mockResolvedValue({ user: { id: "u1" } });
  ((prismadb as any).users.findUnique as jest.Mock).mockResolvedValue({ id: "u1", role, userStatus: "ACTIVE" });
};
const handler = jest.fn(async () => "Connected");
beforeEach(() => {
  jest.clearAllMocks();
  (findPlugin as jest.Mock).mockReturnValue({ definition: { id: "p", extensions: { adminActions: [{ id: "test", label: "x", handler }] } } });
  (getPluginState as jest.Mock).mockResolvedValue({ status: "ENABLED" });
});

it("runs an admin action for admins on enabled plugins", async () => {
  as("admin");
  await expect(runPluginAdminActionAction("p", "test")).resolves.toEqual({ ok: true, message: "Connected" });
  expect(handler).toHaveBeenCalledWith({ id: "ctx" });
});

it("refuses non-admins, disabled plugins and unknown actions", async () => {
  as("manager");
  await expect(runPluginAdminActionAction("p", "test")).resolves.toEqual({ ok: false, error: "Forbidden" });
  as("admin");
  (getPluginState as jest.Mock).mockResolvedValue({ status: "DISABLED" });
  await expect(runPluginAdminActionAction("p", "test")).resolves.toEqual({ ok: false, error: "Not found" });
  (getPluginState as jest.Mock).mockResolvedValue({ status: "ENABLED" });
  await expect(runPluginAdminActionAction("p", "nope")).resolves.toEqual({ ok: false, error: "Not found" });
  expect(handler).not.toHaveBeenCalled();
});

it("reports and logs a failing action", async () => {
  as("admin");
  handler.mockRejectedValueOnce(new Error("Odoo rejected the API key"));
  await expect(runPluginAdminActionAction("p", "test")).resolves.toEqual({ ok: false, error: "Odoo rejected the API key" });
  expect(writePluginLog).toHaveBeenCalledWith("p", "error", expect.stringContaining("test"));
});
```
In `__tests__/plugins/contract.test.ts`, the `titles` list must include admin action labels; add a case to "contract catches broken plugins" only if that test builds plugins with extensions — otherwise rely on the new line below being exercised by real plugins.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest packages/plugin-sdk/__tests__/define.test.ts lib/plugins/__tests__/admin-actions.test.ts`
Expected: FAIL (`adminAction` not a function; `runPluginAdminActionAction` not exported).

- [ ] **Step 3: SDK**

`types.ts`: after `PageRegistration`:
```ts
/** A button on the plugin's admin page; the host runs the handler with the plugin's context and shows the returned text. */
export interface AdminActionRegistration { id: string; label: string; handler: (ctx: PluginContext<any, any>) => Promise<string | void> }
```
`PluginExtensions` gains `adminActions: AdminActionRegistration[];` (after `adminSections`). `ExtensionBuilder` gains, after `adminSection(...)`:
```ts
  adminAction(action: { id: string; label: string; handler: (ctx: PluginContext<S, K>) => Promise<string | void> }): void;
```
`define.ts`: `ext` gains `adminActions: []`; `ids` gains `adminAction: new Set<string>()`; builder after `adminSection`:
```ts
    adminAction: (action) => { unique(ids.adminAction, action.id, "Duplicate admin action id"); ext.adminActions.push(action); },
```
`version.ts`: `export const SDK_VERSION = "0.2.2";`
```bash
sed -i '' 's/expect(SDK_VERSION).toBe("0\.2\.1")/expect(SDK_VERSION).toBe("0.2.2")/' packages/plugin-sdk/__tests__/version.test.ts
sed -i '' 's/it("bumps the SDK to 0\.2\.1", () => expect(SDK_VERSION).toBe("0\.2\.1"))/it("bumps the SDK to 0.2.2", () => expect(SDK_VERSION).toBe("0.2.2"))/' lib/plugins/__tests__/data-api-activities.test.ts
sed -i '' 's/it("is SDK 0\.2\.1 (additive order dates)", () => expect(SDK_VERSION).toBe("0\.2\.1"));/it("is SDK 0.2.2 (additive)", () => expect(SDK_VERSION).toBe("0.2.2"));/' lib/plugins/__tests__/data-api-orders.test.ts
sed -i '' 's/running 0\.2\.1/running 0.2.2/' lib/plugins/__tests__/lifecycle.test.ts
```
`__tests__/plugins/contract.test.ts`: in the `titles` array add `...d.extensions.adminActions.map((a) => a.label)`.

- [ ] **Step 4: Host**

`_actions/plugins.ts`: add imports `import { getLocale } from "next-intl/server";`, `import type { Locale } from "@nextcrm/plugin-sdk";`, `import { findPlugin } from "@/lib/plugins/registry";`, `import { createPluginContext } from "@/lib/plugins/context";`, `import { writePluginLog } from "@/lib/plugins/log";`, and:
```ts
export async function runPluginAdminActionAction(pluginId: string, actionId: string): Promise<{ ok: boolean; message?: string; error?: string }> {
  let adminId: string;
  try {
    adminId = (await requireRole(["admin"])).id;
  } catch (e) {
    if (e instanceof AuthenticationError) return { ok: false, error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { ok: false, error: "Forbidden" };
    throw e;
  }
  const plugin = findPlugin(pluginId);
  const action = plugin?.definition.extensions.adminActions.find((a) => a.id === actionId);
  const state = await getPluginState(pluginId);
  if (!plugin || !action || state?.status !== "ENABLED") return { ok: false, error: "Not found" };
  const ctx = await createPluginContext({ plugin, actor: { type: "user", userId: adminId, role: "admin" }, locale: (await getLocale()) as Locale });
  try {
    const message = await action.handler(ctx);
    revalidatePath(`/admin/plugins/${pluginId}`);
    return { ok: true, ...(message ? { message } : {}) };
  } catch (e) {
    writePluginLog(pluginId, "error", `Admin action ${actionId} failed: ${String(e)}`);
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}
```
`_components/PluginAdminActions.tsx`:
```tsx
"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runPluginAdminActionAction } from "../_actions/plugins";

export function PluginAdminActions({ pluginId, actions }: { pluginId: string; actions: { id: string; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (id: string) => start(async () => {
    const res = await runPluginAdminActionAction(pluginId, id);
    if (!res.ok) { toast.error(res.error ?? "Error"); return; }
    if (res.message) toast.success(res.message);
    router.refresh();
  });
  return <>{actions.map((a) => <Button key={a.id} variant="outline" disabled={pending} onClick={() => run(a.id)}>{a.label}</Button>)}</>;
}
```
`[pluginId]/page.tsx`: import `PluginAdminActions` and `translatePluginMessage` (`@/lib/plugins/i18n`); inside the controls `div` after the status controls:
```tsx
            {state?.status === "ENABLED" && plugin && plugin.definition.extensions.adminActions.length > 0 && (
              <PluginAdminActions pluginId={pluginId} actions={plugin.definition.extensions.adminActions.map((a) => ({ id: a.id, label: translatePluginMessage(pluginId, a.label, undefined, (await getLocale()) as Locale) }))} />
            )}
```
(Compute the locale once above the JSX: `const locale = (await getLocale()) as Locale;` and use it.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec jest packages/plugin-sdk lib/plugins __tests__/plugins plugins` then `pnpm exec tsc --noEmit`
Expected: PASS; tsc clean.

- [ ] **Step 6: Commit**

```bash
git add packages/plugin-sdk lib/plugins/__tests__ __tests__/plugins/contract.test.ts "app/[locale]/(routes)/admin/plugins"
git commit -m "feat(plugins): SDK 0.2.2 admin actions

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Odoo client

**Files:**
- Create: `plugins/odoo-connector/settings.ts`, `plugins/odoo-connector/odoo.ts`, `plugins/odoo-connector/__tests__/fake-odoo.ts`
- Test: `plugins/odoo-connector/__tests__/odoo.test.ts`

**Interfaces:**
- Produces: `settingsSchema`, `secretsSchema`, `Settings`, `Secrets`, `Ctx`; `OdooClient { call<T>(model, method, body?): Promise<T>; version(): Promise<string> }`; `jsonClient(ctx, sleep?)`; `OdooError(message, status)`, `OdooAuthError(status)`; `testConnection(ctx, client?): Promise<string>`; test helper `fakeOdoo(handlers)` returning a `fetch` for `createTestContext`.

- [ ] **Step 1: Write the failing test**

`plugins/odoo-connector/__tests__/fake-odoo.ts`:
```ts
/** A fetch for createTestContext that answers Odoo JSON-2 calls from handlers keyed "model/method". */
export type Handler = (body: Record<string, any>) => unknown | Response;
export function fakeOdoo(handlers: Record<string, Handler>, calls: { path: string; body: any; headers: Record<string, string> }[] = []) {
  return async (url: string, init?: RequestInit) => {
    const path = new URL(url).pathname;
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ path, body, headers: (init?.headers ?? {}) as Record<string, string> });
    const key = path.startsWith("/json/2/") ? path.slice(8) : path;
    const h = handlers[key];
    if (!h) return new Response(JSON.stringify({ message: `no handler for ${key}` }), { status: 404 });
    const out = h(body);
    return out instanceof Response ? out : new Response(JSON.stringify(out), { status: 200 });
  };
}
```
`plugins/odoo-connector/__tests__/odoo.test.ts`:
```ts
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { jsonClient, OdooAuthError, testConnection } from "../odoo";
import { settingsSchema, type Ctx } from "../settings";
import { fakeOdoo } from "./fake-odoo";

const S = settingsSchema.parse({ url: "https://odoo.example.com/", database: "db1" });
const mk = (fetch: any) => createTestContext({ pluginId: "odoo-connector", settings: S, secrets: { apiKey: "k1" }, fetch }) as unknown as Ctx;
const noSleep = async () => {};

it("defaults to a dry run every 15 minutes", () => {
  expect([S.dryRun, S.syncMinutes, S.defaultCountry]).toEqual([true, 15, "CZ"]);
  expect(() => settingsSchema.parse({ url: "http://odoo.example.com", database: "x" })).toThrow();
});

it("posts JSON-2 calls with the key and database", async () => {
  const calls: any[] = [];
  const ctx = mk(fakeOdoo({ "res.partner/search_read": () => [{ id: 1 }] }, calls));
  await expect(jsonClient(ctx, noSleep).call("res.partner", "search_read", { domain: [], fields: ["id"] })).resolves.toEqual([{ id: 1 }]);
  expect(calls[0].path).toBe("/json/2/res.partner/search_read");
  expect(calls[0].headers).toMatchObject({ Authorization: "bearer k1", "X-Odoo-Database": "db1" });
  expect(calls[0].body).toEqual({ domain: [], fields: ["id"] });
});

it("retries 5xx and network errors, then succeeds", async () => {
  let n = 0;
  const ctx = mk(async () => (++n < 3 ? new Response("{}", { status: 502 }) : new Response("[]", { status: 200 })));
  await expect(jsonClient(ctx, noSleep).call("res.partner", "search_read")).resolves.toEqual([]);
  expect(n).toBe(3);
  let m = 0;
  const down = mk(async () => { m++; throw new Error("ECONNRESET"); });
  await expect(jsonClient(down, noSleep).call("res.partner", "search_read")).rejects.toThrow("Odoo unreachable");
  expect(m).toBe(3);
});

it("stops on 401/403 without retrying, and reports other 4xx with Odoo's message", async () => {
  let n = 0;
  const ctx = mk(async () => { n++; return new Response("{}", { status: 401 }); });
  await expect(jsonClient(ctx, noSleep).call("res.partner", "search_read")).rejects.toBeInstanceOf(OdooAuthError);
  expect(n).toBe(1);
  const bad = mk(async () => new Response(JSON.stringify({ message: "Invalid field 'mobile'" }), { status: 422 }));
  await expect(jsonClient(bad, noSleep).call("res.partner", "search_read")).rejects.toThrow("Invalid field 'mobile'");
});

it("tests the connection: version and user name", async () => {
  const ctx = mk(fakeOdoo({
    "res.users/context_get": () => ({ uid: 7, lang: "en_US" }),
    "res.users/read": () => [{ id: 7, name: "API user" }],
    "/web/webclient/version_info": () => ({ jsonrpc: "2.0", result: { server_version: "19.0+e" } }),
  }));
  await expect(testConnection(ctx, jsonClient(ctx, noSleep))).resolves.toBe("admin.connected");
});
```
(`ctx.t` in the test context returns the key.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`settings.ts`:
```ts
import { z, type PluginContext } from "@nextcrm/plugin-sdk";

export const settingsSchema = z.object({
  url: z.string().regex(/^https:\/\/[^\s/]+/, "An https URL, e.g. https://odoo.example.com"),
  database: z.string().min(1),
  syncMinutes: z.number().int().min(5).max(1440).default(15),
  defaultCountry: z.string().length(2).default("CZ"),
  dryRun: z.boolean().default(true),
});
export const secretsSchema = z.object({ apiKey: z.string().min(1) });

export type Settings = z.infer<typeof settingsSchema>;
export type Secrets = z.infer<typeof secretsSchema>;
export type Ctx = PluginContext<Settings, Secrets>;
```
`odoo.ts`:
```ts
import type { Ctx } from "./settings";

export class OdooError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "OdooError"; }
}
export class OdooAuthError extends OdooError {
  constructor(status: number) { super("Odoo rejected the API key", status); this.name = "OdooAuthError"; }
}

/** Spec § 3.1: the transport behind an interface, so an XML-RPC client could replace JSON-2. */
export interface OdooClient {
  call<T = unknown>(model: string, method: string, body?: Record<string, unknown>): Promise<T>;
  version(): Promise<string>;
}

type Sleep = (ms: number) => Promise<void>;
const realSleep: Sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BACKOFF = [2000, 4000];   // 3 attempts in total

export function jsonClient(ctx: Ctx, sleep: Sleep = realSleep): OdooClient {
  const base = ctx.settings.url.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", Authorization: `bearer ${ctx.secrets.apiKey}`, "X-Odoo-Database": ctx.settings.database };
  async function post(path: string, body: unknown): Promise<unknown> {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await ctx.http.fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body), timeoutMs: 30_000 });
      } catch (e) {
        if (attempt >= BACKOFF.length) throw new OdooError(`Odoo unreachable: ${String(e)}`, 0);
        await sleep(BACKOFF[attempt]);
        continue;
      }
      if (res.status === 401 || res.status === 403) throw new OdooAuthError(res.status);
      if (res.status >= 500) {
        if (attempt >= BACKOFF.length) throw new OdooError(`Odoo error ${res.status}`, res.status);
        await sleep(BACKOFF[attempt]);
        continue;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new OdooError(`Odoo error ${res.status}: ${(data as { message?: string } | null)?.message ?? res.statusText}`, res.status);
      return data;
    }
  }
  return {
    call: async <T,>(model: string, method: string, body: Record<string, unknown> = {}) => (await post(`/json/2/${model}/${method}`, body)) as T,
    async version() {
      const data = (await post("/web/webclient/version_info", { jsonrpc: "2.0", method: "call", params: {} })) as { result?: { server_version?: string } } | null;
      return data?.result?.server_version ?? "unknown";
    },
  };
}

export async function testConnection(ctx: Ctx, client: OdooClient = jsonClient(ctx)): Promise<string> {
  const context = await client.call<{ uid?: number }>("res.users", "context_get", {});
  const [user] = context.uid ? await client.call<{ name: string }[]>("res.users", "read", { ids: [context.uid], fields: ["name"] }) : [];
  return ctx.t("admin.connected", { version: await client.version(), user: user?.name ?? "?" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest plugins/odoo-connector` then `pnpm exec tsc --noEmit`
Expected: PASS (5 tests); tsc clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector
git commit -m "feat(odoo-connector): JSON-2 client and settings

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Mapping (pure)

**Files:**
- Create: `plugins/odoo-connector/map.ts`
- Test: `plugins/odoo-connector/__tests__/map.test.ts`

**Interfaces:**
- Produces: `OdooPartner`, `M2O`, `PARTNER_FIELDS`, `accountFields(p, countryCode, defaultCountry): AccountFields`, `contactFields(p): ContactFields`, `splitName(name)`, `changedFields(current, next)`.

- [ ] **Step 1: Write the failing test**

`map.test.ts`:
```ts
import { accountFields, changedFields, contactFields, splitName, type OdooPartner } from "../map";

const codes = (id: number) => ({ 56: "CZ", 201: "SK" } as Record<number, string>)[id] ?? null;
const p = (over: Partial<OdooPartner> = {}): OdooPartner => ({
  id: 1, name: "Café Nora s.r.o.", is_company: true, company_registry: "2708 2440", vat: "CZ27082440",
  street: "Hlavní 1", street2: "2. patro", city: "Tábor", zip: "390 01", state_id: [5, "Jihočeský kraj"], country_id: [56, "Czechia"],
  email: "info@nora.example", phone: false, mobile: "+420 777 000 111", function: false, user_id: [9, "Rep One"], parent_id: false,
  type: "contact", active: true, customer_rank: 3, write_date: "2026-10-10 08:00:00", ...over,
});

it("maps a company partner to account fields", () => {
  expect(accountFields(p(), codes, "CZ")).toEqual({
    name: "Café Nora s.r.o.", company_id: "2708 2440", vat: "CZ27082440",
    billing_street: "Hlavní 1, 2. patro", billing_city: "Tábor", billing_postal_code: "390 01", billing_state: "Jihočeský kraj",
    billing_country: "CZ", email: "info@nora.example", office_phone: "+420 777 000 111",
  });
});

it("falls back to the default country and keeps empty fields null", () => {
  const f = accountFields(p({ country_id: false, street2: false, company_registry: false, state_id: false, phone: "123", mobile: false, email: false }), codes, "SK");
  expect([f.billing_country, f.billing_street, f.company_id, f.billing_state, f.office_phone, f.email]).toEqual(["SK", "Hlavní 1", null, null, "123", null]);
});

it("splits person names: last word is the last name", () => {
  expect(splitName("Jana Marie Nováková")).toEqual({ first_name: "Jana Marie", last_name: "Nováková" });
  expect(splitName("Madonna")).toEqual({ first_name: null, last_name: "Madonna" });
  expect(contactFields(p({ name: "Petr Svoboda", email: "p@x.example", phone: "1", mobile: "2", function: "Buyer" }))).toEqual({
    first_name: "Petr", last_name: "Svoboda", email: "p@x.example", office_phone: "1", mobile_phone: "2", position: "Buyer",
  });
});

it("lists only fields whose value differs (Review Focus 3)", () => {
  expect(changedFields({ name: "Old", vat: "CZ1", email: null }, { name: "New", vat: "CZ1", email: null })).toEqual({ name: "New" });
  expect(changedFields({ name: "Same" }, { name: "Same", city: null } as Record<string, unknown>)).toEqual({});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/map.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`map.ts`:
```ts
export type M2O = [number, string] | false;

export interface OdooPartner {
  id: number;
  name: string;
  is_company?: boolean;
  company_registry?: string | false;
  vat?: string | false;
  street?: string | false;
  street2?: string | false;
  city?: string | false;
  zip?: string | false;
  state_id?: M2O;
  country_id?: M2O;
  email?: string | false;
  phone?: string | false;
  mobile?: string | false;
  function?: string | false;
  user_id?: M2O;
  parent_id?: M2O;
  type?: string;
  active?: boolean;
  customer_rank?: number;
  write_date: string;
}

/** Wanted fields; the sync keeps only those this Odoo has (Ruling 3). */
export const PARTNER_FIELDS = [
  "id", "name", "is_company", "company_registry", "vat", "street", "street2", "city", "zip", "state_id", "country_id",
  "email", "phone", "mobile", "function", "user_id", "parent_id", "type", "active", "customer_rank", "write_date",
];

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Spec § 3.4: the synced account fields; Odoo wins for these and only these. */
export function accountFields(p: OdooPartner, countryCode: (id: number) => string | null, defaultCountry: string) {
  return {
    name: str(p.name) ?? `Odoo #${p.id}`,
    company_id: str(p.company_registry),
    vat: str(p.vat),
    billing_street: [str(p.street), str(p.street2)].filter(Boolean).join(", ") || null,
    billing_city: str(p.city),
    billing_postal_code: str(p.zip),
    billing_state: p.state_id ? p.state_id[1] : null,
    billing_country: (p.country_id ? countryCode(p.country_id[0]) : null) ?? defaultCountry,
    email: str(p.email),
    office_phone: str(p.phone) ?? str(p.mobile),
  };
}
export type AccountFields = ReturnType<typeof accountFields>;

export function splitName(name: string): { first_name: string | null; last_name: string } {
  const parts = name.trim().split(/\s+/);
  const last = parts.pop() ?? "";
  return { first_name: parts.join(" ") || null, last_name: last };
}

/** Spec § 3.5. */
export function contactFields(p: OdooPartner) {
  return {
    ...splitName(str(p.name) ?? `Odoo #${p.id}`),
    email: str(p.email),
    office_phone: str(p.phone),
    mobile_phone: str(p.mobile),
    position: str(p.function),
  };
}
export type ContactFields = ReturnType<typeof contactFields>;

/** Only the keys whose value differs from the stored row (null and undefined are the same). */
export function changedFields<T extends Record<string, unknown>>(current: Record<string, unknown>, next: T): Partial<T> {
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => (current[k] ?? null) !== (v ?? null))) as Partial<T>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/map.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector/map.ts plugins/odoo-connector/__tests__/map.test.ts
git commit -m "feat(odoo-connector): partner to account and contact mapping

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Matching and store keys

**Files:**
- Create: `plugins/odoo-connector/store.ts`, `plugins/odoo-connector/match.ts`
- Test: `plugins/odoo-connector/__tests__/match.test.ts`

**Interfaces:**
- Produces: `K`, `AccountLink`, `Conflict`, `RunSummary`; `normalizeNumber(country, raw)`, `normalizeVat(raw)`, `Match`, `matchAccount(ctx, partnerId, fields): Promise<Match>`.

- [ ] **Step 1: Write the failing test**

`match.test.ts`:
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { matchAccount, normalizeNumber, normalizeVat } from "../match";
import { accountFields, type OdooPartner } from "../map";
import { settingsSchema, type Ctx } from "../settings";
import { K } from "../store";

const S = settingsSchema.parse({ url: "https://odoo.example.com", database: "db" });
const mk = (accounts: RecordData[]) => createTestContext({ pluginId: "odoo-connector", settings: S, data: { accounts } }) as unknown as Ctx;
const fields = (over: Partial<OdooPartner> = {}) =>
  accountFields({ id: 5, name: "Nora", company_registry: "7082440", vat: "CZ 07082440", country_id: false, write_date: "x", ...over }, () => null, "CZ");

it("normalizes numbers like account protection (CZ pads to 8) and VAT", () => {
  expect(normalizeNumber("CZ", " 7082440 ")).toBe("07082440");
  expect(normalizeNumber("SK", "36 421 928")).toBe("36421928");
  expect(normalizeNumber("CZ", null)).toBeNull();
  expect(normalizeVat("cz 070 82440")).toBe("CZ07082440");
});

it("prefers the link, then the number, then the VAT", async () => {
  const ctx = mk([
    { id: "a1", name: "X", company_id: "07082440", vat: null, billing_country: "Czechia", deletedAt: null },
    { id: "a2", name: "Y", company_id: null, vat: "CZ07082440", billing_country: "CZ", deletedAt: null },
  ]);
  await expect(matchAccount(ctx, 5, fields())).resolves.toEqual({ kind: "number", accountId: "a1" });
  await expect(matchAccount(ctx, 5, fields({ company_registry: false }))).resolves.toEqual({ kind: "vat", accountId: "a2" });
  await ctx.store.set(K.partner(5), { accountId: "a2" });
  await expect(matchAccount(ctx, 5, fields())).resolves.toEqual({ kind: "linked", accountId: "a2" });
});

it("reports a conflict when two accounts match (Review Focus 2)", async () => {
  const ctx = mk([
    { id: "a1", name: "X", company_id: "07082440", deletedAt: null },
    { id: "a3", name: "Z", company_id: "7082440", deletedAt: null },
  ]);
  await expect(matchAccount(ctx, 5, fields())).resolves.toEqual({ kind: "conflict", reason: "number", candidates: ["a1", "a3"] });
});

it("creates when nothing matches, and ignores deleted or stale links (Review Focus 5)", async () => {
  const ctx = mk([{ id: "gone", name: "Old", company_id: "07082440", deletedAt: "2026-01-01" }]);
  await ctx.store.set(K.partner(5), { accountId: "gone" });
  await expect(matchAccount(ctx, 5, fields())).resolves.toEqual({ kind: "new" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/match.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`store.ts`:
```ts
export const K = {
  partner: (id: number) => `partner:${id}`,          // → { accountId }
  account: (id: string) => `account:${id}`,           // → AccountLink
  contact: (id: number) => `contact:${id}`,           // → { contactId }
  conflict: (id: number) => `conflict:${id}`,         // → Conflict
  cursor: "meta:cursor",                              // → { at: Odoo write_date }
  lastRun: "meta:lastRun",                            // → RunSummary
  failures: "meta:failures",                          // → { count }
  lock: "meta:lock",                                  // → { until: ISO }
};

export interface AccountLink {
  partnerId: number;
  syncedAt: string;
  salesperson: string | null;   // the Odoo salesperson's name when no CRM user matched (Needs owner)
  archived?: boolean;
  notCustomer?: boolean;
}

export interface Conflict { partnerId: number; name: string; reason: "number" | "vat"; candidates: string[]; foundAt: string }

export interface RunSummary {
  at: string;
  ok: boolean;
  dryRun: boolean;
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  conflicts: number;
  failed: number;
  error?: string;
}
```
`match.ts`:
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import type { AccountFields } from "./map";
import type { Ctx } from "./settings";
import { K } from "./store";

/** Same rule as account-protection's number key: whitespace out, upper case, CZ left-padded to 8 digits. */
export function normalizeNumber(country: string | null, raw: string | null): string | null {
  if (!raw) return null;
  const n = raw.replace(/\s+/g, "").toUpperCase();
  if (!n) return null;
  return (country ?? "").toUpperCase() === "CZ" && /^\d{1,8}$/.test(n) ? n.padStart(8, "0") : n;
}

export const normalizeVat = (raw: string | null): string | null => (raw ? raw.replace(/\s+/g, "").toUpperCase() || null : null);

export type Match =
  | { kind: "linked" | "number" | "vat"; accountId: string }
  | { kind: "new" }
  | { kind: "conflict"; reason: "number" | "vat"; candidates: string[] };

function pick(rows: RecordData[], reason: "number" | "vat"): Match | null {
  if (rows.length === 1) return { kind: reason, accountId: rows[0].id as string };
  if (rows.length > 1) return { kind: "conflict", reason, candidates: rows.map((r) => r.id as string) };
  return null;
}

/** Spec § 3.4: link, then country + registration number, then VAT, else new (Ruling 5 for candidate lookup). */
export async function matchAccount(ctx: Ctx, partnerId: number, f: AccountFields): Promise<Match> {
  const linked = await ctx.store.get<{ accountId: string }>(K.partner(partnerId));
  if (linked) {
    const acc = await ctx.data.accounts.get(linked.accountId);
    if (acc && acc.deletedAt == null) return { kind: "linked", accountId: linked.accountId };
  }
  const number = normalizeNumber(f.billing_country, f.company_id);
  if (number) {
    const raw = Array.from(new Set([f.company_id as string, number, number.replace(/^0+/, "")]));
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, company_id: { in: raw } } }))
      .filter((a) => normalizeNumber(f.billing_country, (a.company_id as string | null) ?? null) === number);
    const m = pick(rows, "number");
    if (m) return m;
  }
  const vat = normalizeVat(f.vat);
  if (vat) {
    const raw = Array.from(new Set([f.vat as string, vat]));
    const rows = (await ctx.data.accounts.find({ where: { deletedAt: null, vat: { in: raw } } }))
      .filter((a) => normalizeVat((a.vat as string | null) ?? null) === vat);
    const m = pick(rows, "vat");
    if (m) return m;
  }
  return { kind: "new" };
}
```
Note: SDK test tables compare `where` values with `===`, so test fixtures carry `deletedAt: null` explicitly.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/match.test.ts` then `pnpm exec tsc --noEmit`
Expected: PASS (4 tests); tsc clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector/store.ts plugins/odoo-connector/match.ts plugins/odoo-connector/__tests__/match.test.ts
git commit -m "feat(odoo-connector): matching by link, number and VAT

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Sync — customers, cursor, lock, dry run, alerts

**Files:**
- Create: `plugins/odoo-connector/sync.ts`
- Test: `plugins/odoo-connector/__tests__/sync.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces: `odooTime(d)`, `runSync(ctx, client, now): Promise<RunSummary>`, `scheduledSync(ctx, now, client?)`, `summaryText(ctx, s)`.

- [ ] **Step 1: Write the failing test**

`__tests__/helpers.ts` (shared by the sync and people tests):
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { jsonClient } from "../odoo";
import { settingsSchema, type Ctx } from "../settings";
import { fakeOdoo } from "./fake-odoo";

export type TestCtx = Ctx & { notifications: { roles?: string[]; subject: string }[]; logs: { level: string; message: string }[] };
export const now = new Date("2026-10-13T08:00:00Z");
export const noSleep = async () => {};

export function odoo(partners: RecordData[], users: RecordData[] = [{ id: 9, login: "rep@x.example", email: "Rep@X.example" }]) {
  const domainMatch = (p: RecordData, domain: any[]) => {
    // Minimal evaluator for the domains the sync sends: implicit AND with one optional "|" pair.
    const test = ([f, op, v]: any[]) => {
      const x = Array.isArray(p[f]) ? (p[f] as any[])[0] : p[f];
      if (op === "=") return (x === undefined ? false : x) === v;
      if (op === "!=") return (x === undefined ? false : x) !== v;
      if (op === ">") return (x ?? "") > v;
      if (op === "in") return v.includes(x);
      throw new Error(op);
    };
    for (let i = 0; i < domain.length; i++) {
      if (domain[i] === "|") { if (!(test(domain[i + 1]) || test(domain[i + 2]))) return false; i += 2; continue; }
      if (!test(domain[i])) return false;
    }
    return true;
  };
  return fakeOdoo({
    "res.partner/fields_get": () => Object.fromEntries(["id", "name", "is_company", "company_registry", "vat", "street", "city", "zip", "country_id", "email", "phone", "function", "user_id", "parent_id", "type", "active", "customer_rank", "write_date"].map((f) => [f, {}])),
    "res.country/search_read": () => [{ id: 56, code: "CZ" }],
    "res.users/read": (b) => users.filter((u) => b.ids.includes(u.id)),
    "res.partner/search_read": (b) => {
      const activeTest = b.context?.active_test !== false;
      const rows = partners.filter((p) => (!activeTest || p.active !== false) && domainMatch(p, b.domain));
      const sorted = b.order?.startsWith("write_date") ? [...rows].sort((a, c) => String(a.write_date).localeCompare(String(c.write_date)) || Number(a.id) - Number(c.id)) : [...rows].sort((a, c) => Number(a.id) - Number(c.id));
      return sorted.slice(b.offset ?? 0, (b.offset ?? 0) + (b.limit ?? sorted.length)).map((p) => Object.fromEntries(b.fields.map((f: string) => [f, p[f] ?? false])));
    },
  });
}
export const company = (id: number, over: RecordData = {}) => ({ id, name: `Co ${id}`, is_company: true, company_registry: false, vat: false, country_id: [56, "Czechia"], email: false, phone: false, user_id: [9, "Rep"], parent_id: false, type: "contact", active: true, customer_rank: 1, write_date: "2026-10-10 08:00:00", ...over });
export const person = (id: number, parent: number, over: RecordData = {}) => ({ id, name: `Jan Person${id}`, is_company: false, email: `p${id}@x.example`, parent_id: [parent, "Co"], type: "contact", active: true, customer_rank: 0, write_date: "2026-10-10 08:00:00", ...over });

export function mk(partners: RecordData[], accounts: RecordData[] = [], settings: Record<string, unknown> = {}, users: RecordData[] = [{ id: "u-rep", email: "rep@x.example", userStatus: "ACTIVE" }]) {
  const ctx = createTestContext({
    pluginId: "odoo-connector",
    settings: settingsSchema.parse({ url: "https://odoo.example.com", database: "db", dryRun: false, ...settings }),
    secrets: { apiKey: "k" }, fetch: odoo(partners), data: { accounts, contacts: [], users },
  }) as unknown as TestCtx;
  return { ctx, client: jsonClient(ctx, noSleep) };
}
```
`sync.test.ts`:
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { runSync, scheduledSync } from "../sync";
import { OdooAuthError } from "../odoo";
import { K, type AccountLink, type Conflict, type RunSummary } from "../store";
import { company, mk, now } from "./helpers";

it("imports customers on the first run: create, link by number, link by VAT, owner by email", async () => {
  const accounts: RecordData[] = [
    { id: "a1", name: "Old name", company_id: "27082440", vat: null, billing_country: "CZ", deletedAt: null, assigned_to: "someone" },
    { id: "a2", name: "VAT match", company_id: null, vat: "CZ11111111", billing_country: "CZ", deletedAt: null, assigned_to: null },
  ];
  const { ctx, client } = mk([company(1, { company_registry: "27082440" }), company(2, { vat: "CZ11111111" }), company(3, { name: "Bob Customer", is_company: false, user_id: false }), company(4, { customer_rank: 0 })], accounts);
  const s = await runSync(ctx, client, now);
  expect(s).toMatchObject({ ok: true, created: 1, updated: 2, conflicts: 0 });
  expect(accounts.find((a) => a.id === "a1")).toMatchObject({ name: "Co 1", assigned_to: "someone" });   // owner kept
  const created = accounts.find((a) => a.name === "Bob Customer")!;
  expect(created).toMatchObject({ billing_country: "CZ", assigned_to: null });
  expect(await ctx.store.get<AccountLink>(K.account(created.id as string))).toMatchObject({ partnerId: 3, salesperson: null });
  expect(await ctx.store.get(K.cursor)).toEqual({ at: "2026-10-10 08:00:00" });
});

it("gives a new account the salesperson's CRM user, or lists the salesperson for Needs owner", async () => {
  const accounts: RecordData[] = [];
  const { ctx, client } = mk([company(1), company(2, { user_id: [10, "Unknown Rep"] })], accounts);
  await runSync(ctx, client, now);
  expect(accounts.find((a) => a.name === "Co 1")?.assigned_to).toBe("u-rep");
  const second = accounts.find((a) => a.name === "Co 2")!;
  expect(second.assigned_to).toBeNull();
  expect((await ctx.store.get<AccountLink>(K.account(second.id as string)))?.salesperson).toBe("Unknown Rep");
});

it("records a conflict and touches neither account (Review Focus 2)", async () => {
  const accounts: RecordData[] = [
    { id: "a1", name: "A", company_id: "27082440", deletedAt: null },
    { id: "a2", name: "B", company_id: "27082440", deletedAt: null },
  ];
  const { ctx, client } = mk([company(1, { company_registry: "27082440" })], accounts);
  expect(await runSync(ctx, client, now)).toMatchObject({ conflicts: 1, created: 0, updated: 0 });
  expect((await ctx.store.get<Conflict>(K.conflict(1)))?.candidates).toEqual(["a1", "a2"]);
  expect(accounts.map((a) => a.name)).toEqual(["A", "B"]);
});

it("is idempotent; Odoo's value replaces a CRM edit when the partner next changes in Odoo (Review Focus 1, 3)", async () => {
  const accounts: RecordData[] = [];
  const partners = [company(1, { company_registry: "27082440" })];
  const { ctx, client } = mk(partners, accounts);
  await runSync(ctx, client, now);
  await runSync(ctx, client, new Date(now.getTime() + 60_000));
  expect(accounts).toHaveLength(1);
  accounts[0].name = "Edited in CRM";
  partners[0].write_date = "2026-10-13 07:59:00";
  await runSync(ctx, client, new Date(now.getTime() + 120_000));
  expect(accounts[0].name).toBe("Co 1");
});

it("syncs incrementally from the cursor with a 2-minute overlap; marks archived and no-longer-customers", async () => {
  const accounts: RecordData[] = [];
  const partners = [company(1), company(2)];
  const { ctx, client } = mk(partners, accounts);
  await runSync(ctx, client, now);
  Object.assign(partners[0], { name: "Renamed", write_date: "2026-10-10 07:59:00" });   // inside the overlap
  Object.assign(partners[1], { active: false, write_date: "2026-10-13 07:00:00" });
  const s = await runSync(ctx, client, new Date(now.getTime() + 60_000));
  expect(s).toMatchObject({ updated: 1, skipped: 1 });
  expect(accounts.some((a) => a.name === "Renamed")).toBe(true);
  const link2 = (await ctx.store.list("account:")).map((e) => e.value as AccountLink).find((l) => l.partnerId === 2);
  expect(link2).toMatchObject({ archived: true });
  expect(accounts).toHaveLength(2);   // nothing deleted
});

it("dry run writes nothing and does not move the cursor", async () => {
  const accounts: RecordData[] = [];
  const { ctx, client } = mk([company(1)], accounts, { dryRun: true });
  expect(await runSync(ctx, client, now)).toMatchObject({ ok: true, dryRun: true, created: 1 });
  expect(accounts).toHaveLength(0);
  expect(await ctx.store.get(K.cursor)).toBeNull();
  expect(await ctx.store.list("partner:")).toEqual([]);
  expect(ctx.logs.some((l) => l.message.includes("would create account"))).toBe(true);
});

it("stops on a rejected key mid-run, keeps the cursor, and alerts admins after three failures (Review Focus 4)", async () => {
  const { ctx } = mk([]);
  const failing = { call: async () => { throw new OdooAuthError(401); }, version: async () => "x" };
  for (let i = 0; i < 4; i++) {
    const s = await runSync(ctx, failing as never, new Date(now.getTime() + i * 1000));
    expect(s).toMatchObject({ ok: false, error: "Odoo rejected the API key" });
  }
  expect(ctx.notifications.filter((n) => n.roles?.includes("admin"))).toHaveLength(1);
  expect(await ctx.store.get(K.cursor)).toBeNull();
  expect(await ctx.store.get(K.lock)).toBeNull();
});

it("skips a run while another holds the lock", async () => {
  const { ctx, client } = mk([company(1)]);
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + 60_000).toISOString() });
  await runSync(ctx, client, now);
  expect(await ctx.store.get(K.lastRun)).toBeNull();
  expect(ctx.logs.some((l) => l.message.includes("another run"))).toBe(true);
});

it("scheduled sync waits for syncMinutes since the last run", async () => {
  const { ctx, client } = mk([company(1)]);
  await ctx.store.set(K.lastRun, { at: new Date(now.getTime() - 10 * 60_000).toISOString(), ok: true } as RunSummary);
  expect(await scheduledSync(ctx, now, client)).toBe(false);
  expect(await scheduledSync(ctx, new Date(now.getTime() + 5 * 60_000 - 20_000), client)).toBe(true);
});

it("re-matches when a linked account was deleted in the CRM (Review Focus 5)", async () => {
  const accounts: RecordData[] = [];
  const partners = [company(1, { company_registry: "27082440" })];
  const { ctx, client } = mk(partners, accounts);
  await runSync(ctx, client, now);
  accounts[0].deletedAt = "2026-10-13";
  partners[0].write_date = "2026-10-13 07:59:00";
  await runSync(ctx, client, new Date(now.getTime() + 60_000));
  expect(accounts.filter((a) => a.deletedAt == null)).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/sync.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

`sync.ts`:
```ts
import type { M2O, OdooPartner } from "./map";
import { PARTNER_FIELDS, accountFields, changedFields } from "./map";
import { matchAccount } from "./match";
import { OdooAuthError, jsonClient, type OdooClient } from "./odoo";
import type { Ctx } from "./settings";
import { K, type AccountLink, type Conflict, type RunSummary } from "./store";

const PAGE = 100;
const OVERLAP_MS = 2 * 60_000;
const LOCK_MS = 10 * 60_000;
const SLACK_MS = 30_000;

type Counts = Pick<RunSummary, "created" | "updated" | "unchanged" | "skipped" | "conflicts" | "failed">;
const zero = (): Counts => ({ created: 0, updated: 0, unchanged: 0, skipped: 0, conflicts: 0, failed: 0 });

/** Odoo datetimes are UTC "YYYY-MM-DD HH:MM:SS". */
export const odooTime = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
const fromOdoo = (s: string) => new Date(`${s.replace(" ", "T")}Z`);

interface Run {
  ctx: Ctx;
  client: OdooClient;
  now: Date;
  dry: boolean;
  counts: Counts;
  fields: string[];
  countries: Map<number, string>;
  owners: Map<number, string | null>;
}

const CUSTOMER = [["customer_rank", ">", 0], ["parent_id", "=", false]];

async function ownerFor(r: Run, user: M2O | undefined): Promise<string | null> {
  if (!user) return null;
  if (!r.owners.has(user[0])) {
    const [u] = await r.client.call<{ login?: string; email?: string | false }[]>("res.users", "read", { ids: [user[0]], fields: ["login", "email"] });
    const email = (typeof u?.email === "string" && u.email) || u?.login || null;
    let id: string | null = null;
    for (const candidate of email ? Array.from(new Set([email, email.toLowerCase()])) : []) {
      const [row] = await r.ctx.data.users.find({ where: { email: candidate, userStatus: "ACTIVE" }, take: 1 });
      if (row) { id = row.id as string; break; }
    }
    r.owners.set(user[0], id);
  }
  return r.owners.get(user[0]) ?? null;
}

async function syncCustomer(r: Run, p: OdooPartner): Promise<void> {
  const { ctx, dry } = r;
  const link = await ctx.store.get<{ accountId: string }>(K.partner(p.id));
  if (p.active === false || !p.customer_rank) {
    if (link && !dry) {
      const prev = await ctx.store.get<AccountLink>(K.account(link.accountId));
      await ctx.store.set(K.account(link.accountId), { partnerId: p.id, salesperson: prev?.salesperson ?? null, syncedAt: r.now.toISOString(), archived: p.active === false, notCustomer: !p.customer_rank } satisfies AccountLink);
    }
    r.counts.skipped++;
    return;
  }
  const fields = accountFields(p, (id) => r.countries.get(id) ?? null, ctx.settings.defaultCountry);
  const match = await matchAccount(ctx, p.id, fields);
  if (match.kind === "conflict") {
    r.counts.conflicts++;
    if (!dry) await ctx.store.set(K.conflict(p.id), { partnerId: p.id, name: fields.name, reason: match.reason, candidates: match.candidates, foundAt: r.now.toISOString() } satisfies Conflict);
    return;
  }
  if (!dry) await ctx.store.delete(K.conflict(p.id));
  let accountId: string;
  let salesperson: string | null;
  if (match.kind === "new") {
    const owner = await ownerFor(r, p.user_id);
    salesperson = owner ? null : p.user_id ? p.user_id[1] : null;
    r.counts.created++;
    if (dry) { ctx.log.info("Dry run: would create account", { partnerId: p.id, ...fields, assigned_to: owner }); return; }
    accountId = (await ctx.data.accounts.create({ ...fields, assigned_to: owner })).id as string;
  } else {
    accountId = match.accountId;
    const diff = changedFields((await ctx.data.accounts.get(accountId)) ?? {}, fields);
    if (!Object.keys(diff).length) r.counts.unchanged++;
    else {
      r.counts.updated++;
      if (dry) { ctx.log.info("Dry run: would update account", { partnerId: p.id, accountId, ...diff }); return; }
      await ctx.data.accounts.update(accountId, diff);
    }
    if (dry) return;
    salesperson = (await ctx.store.get<AccountLink>(K.account(accountId)))?.salesperson ?? null;
  }
  await ctx.store.set(K.partner(p.id), { accountId });
  await ctx.store.set(K.account(accountId), { partnerId: p.id, syncedAt: r.now.toISOString(), salesperson } satisfies AccountLink);
}

/** One partner's failure is logged and counted; a rejected key stops the run (spec § 3.1). */
async function guarded(r: Run, p: OdooPartner, fn: (r: Run, p: OdooPartner) => Promise<void>) {
  try {
    await fn(r, p);
  } catch (e) {
    if (e instanceof OdooAuthError) throw e;
    r.counts.failed++;
    r.ctx.log.error(`Partner ${p.id} failed: ${e instanceof Error ? e.message : String(e)}`, { partnerId: p.id });
  }
}

async function pages(r: Run, domain: unknown[], order: string, fn: (r: Run, p: OdooPartner) => Promise<void>, opts: { archived?: boolean; onPage?: (rows: OdooPartner[]) => Promise<void> } = {}) {
  for (let offset = 0; ; offset += PAGE) {
    const rows = await r.client.call<OdooPartner[]>("res.partner", "search_read", {
      domain, fields: r.fields, limit: PAGE, offset, order, ...(opts.archived ? { context: { active_test: false } } : {}),
    });
    for (const p of rows) await guarded(r, p, fn);
    if (opts.onPage) await opts.onPage(rows);
    if (rows.length < PAGE) return;
  }
}

const linkedIds = async (ctx: Ctx) => (await ctx.store.list("partner:")).map((e) => Number(e.key.slice(8)));
const newest = (rows: OdooPartner[], prev: string | null) => rows.reduce<string | null>((m, p) => (!m || p.write_date > m ? p.write_date : m), prev);

async function firstImport(r: Run): Promise<string | null> {
  let top: string | null = null;
  await pages(r, [...CUSTOMER, ["active", "=", true]], "id asc", syncCustomer, { onPage: async (rows) => { top = newest(rows, top); } });
  return top;
}

async function incremental(r: Run, cursor: string): Promise<string | null> {
  const since = odooTime(new Date(fromOdoo(cursor).getTime() - OVERLAP_MS));
  let top: string | null = cursor;
  const save = async (rows: OdooPartner[]) => {
    top = newest(rows, top);
    if (!r.dry && top) await r.ctx.store.set(K.cursor, { at: top });
  };
  const linked = await linkedIds(r.ctx);
  await pages(r, [["write_date", ">", since], ["parent_id", "=", false], "|", ["customer_rank", ">", 0], ["id", "in", linked]], "write_date asc, id asc", syncCustomer, { archived: true, onPage: save });
  return top;
}

export function summaryText(ctx: Ctx, s: RunSummary): string {
  return s.ok ? ctx.t("admin.counts", { created: s.created, updated: s.updated, unchanged: s.unchanged, skipped: s.skipped, conflicts: s.conflicts, failed: s.failed })
    : ctx.t("admin.failed", { error: s.error ?? "?" });
}

export async function runSync(ctx: Ctx, client: OdooClient, now: Date): Promise<RunSummary> {
  const lock = await ctx.store.get<{ until: string }>(K.lock);
  const dry = ctx.settings.dryRun;
  if (lock && Date.parse(lock.until) > now.getTime()) {
    ctx.log.info("Sync skipped: another run is in progress");
    return { at: now.toISOString(), ok: true, dryRun: dry, ...zero() };
  }
  await ctx.store.set(K.lock, { until: new Date(now.getTime() + LOCK_MS).toISOString() });
  const r: Run = { ctx, client, now, dry, counts: zero(), fields: [], countries: new Map(), owners: new Map() };
  const started = Date.now();
  let summary: RunSummary;
  try {
    const available = await client.call<Record<string, unknown>>("res.partner", "fields_get", { attributes: ["type"] });
    r.fields = PARTNER_FIELDS.filter((f) => f in available);
    r.countries = new Map((await client.call<{ id: number; code: string }[]>("res.country", "search_read", { domain: [], fields: ["code"] })).map((c) => [c.id, c.code]));
    const cursor = await ctx.store.get<{ at: string }>(K.cursor);
    const top = cursor ? await incremental(r, cursor.at) : await firstImport(r);
    if (!dry && top) await ctx.store.set(K.cursor, { at: top });
    summary = { at: now.toISOString(), ok: true, dryRun: dry, ...r.counts };
    await ctx.store.set(K.failures, { count: 0 });
    ctx.log.info(`Sync finished${dry ? " (dry run)" : ""}`, { ...r.counts, ms: Date.now() - started });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    summary = { at: now.toISOString(), ok: false, dryRun: dry, ...r.counts, error };
    ctx.log.error(`Sync failed: ${error}`, { ...r.counts });
    const failures = ((await ctx.store.get<{ count: number }>(K.failures))?.count ?? 0) + 1;
    await ctx.store.set(K.failures, { count: failures });
    if (failures === 3) await ctx.notify({ roles: ["admin"], subject: ctx.t("mail.failingSubject"), text: ctx.t("mail.failingText", { error }) });
  } finally {
    await ctx.store.delete(K.lock);
  }
  await ctx.store.set(K.lastRun, summary);
  return summary;
}

/** Ruling 2: the cron runs every 5 minutes; a sync starts when syncMinutes have passed since the last one. */
export async function scheduledSync(ctx: Ctx, now: Date, client: OdooClient = jsonClient(ctx)): Promise<boolean> {
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  if (last && now.getTime() - Date.parse(last.at) < ctx.settings.syncMinutes * 60_000 - SLACK_MS) return false;
  await runSync(ctx, client, now);
  return true;
}
```
(`fromOdoo`/`odooTime` handle the cursor arithmetic; `newest` compares Odoo's fixed-width strings.)

Note on the lock test: `runSync` returns without writing `lastRun` when locked — the test asserts `lastRun` stays null.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec jest plugins/odoo-connector` then `pnpm exec tsc --noEmit`
Expected: PASS; tsc clean. If a test's fake-Odoo domain evaluator meets an operator it does not know, extend `test()` in the test file (it throws on unknown operators on purpose).

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector/sync.ts plugins/odoo-connector/__tests__/sync.test.ts plugins/odoo-connector/__tests__/helpers.ts
git commit -m "feat(odoo-connector): customer sync with cursor, dry run and alerts

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: People → contacts

**Files:**
- Modify: `plugins/odoo-connector/sync.ts`
- Test: `plugins/odoo-connector/__tests__/people.test.ts`

**Interfaces:**
- Consumes: `runSync`, helpers from `__tests__/helpers.ts` (Task 5), `contactFields`.
- Produces: `syncPerson` and the people pages in `firstImport` and `incremental` (spec § 3.5; Ruling 6).

- [ ] **Step 1: Write the failing test**

`people.test.ts`:
```ts
import type { RecordData } from "@nextcrm/plugin-sdk";
import { runSync } from "../sync";
import { K } from "../store";
import { company, mk, now, person } from "./helpers";

it("imports people under linked customers as contacts and updates them in place (Review Focus 1)", async () => {
  const accounts: RecordData[] = [];
  const partners = [company(1), person(11, 1, { function: "Buyer", phone: "1" }), person(12, 1, { name: "Eva" }), person(13, 99)];
  const { ctx, client } = mk(partners, accounts);
  await runSync(ctx, client, now);
  const contacts = await ctx.data.contacts.find({});
  expect(contacts.map((c) => [c.first_name, c.last_name, c.position, c.accountsIDs])).toEqual([
    ["Jan", "Person11", "Buyer", accounts[0].id], [null, "Eva", null, accounts[0].id],
  ]);
  partners[1].write_date = "2026-10-13 07:59:00";
  partners[1].function = "Head buyer";
  await runSync(ctx, client, new Date(now.getTime() + 60_000));
  const again = await ctx.data.contacts.find({});
  expect(again).toHaveLength(2);
  expect(again.find((c) => c.last_name === "Person11")?.position).toBe("Head buyer");
  expect(await ctx.store.get(K.contact(13))).toBeNull();   // its customer is not synced
});

it("links an existing contact with the same email instead of creating one", async () => {
  const accounts: RecordData[] = [{ id: "a1", name: "Co", company_id: "27082440", deletedAt: null }];
  const { ctx, client } = mk([company(1, { company_registry: "27082440" }), person(11, 1, { email: "known@x.example" })], accounts);
  await ctx.data.contacts.create({ last_name: "Known", email: "known@x.example", accountsIDs: "a1" });
  await runSync(ctx, client, now);
  expect(await ctx.data.contacts.find({})).toHaveLength(1);
  expect(await ctx.store.get(K.contact(11))).toEqual({ contactId: expect.any(String) });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/people.test.ts`
Expected: FAIL (no contacts are created yet).

- [ ] **Step 3: Implement**

In `sync.ts`, import `contactFields` from `./map` again, add before `guarded`:
```ts
async function syncPerson(r: Run, p: OdooPartner): Promise<void> {
  const { ctx, dry } = r;
  const parent = p.parent_id ? await ctx.store.get<{ accountId: string }>(K.partner(p.parent_id[0])) : null;
  if (p.active === false || !parent) { r.counts.skipped++; return; }
  const fields = contactFields(p);
  const link = await ctx.store.get<{ contactId: string }>(K.contact(p.id));
  let current = link ? await ctx.data.contacts.get(link.contactId) : null;
  if (!current && fields.email) [current] = await ctx.data.contacts.find({ where: { accountsIDs: parent.accountId, email: fields.email }, take: 1 });
  if (!current) {
    r.counts.created++;
    if (dry) { ctx.log.info("Dry run: would create contact", { partnerId: p.id, accountId: parent.accountId, ...fields }); return; }
    const row = await ctx.data.contacts.create({ ...fields, accountsIDs: parent.accountId });
    await ctx.store.set(K.contact(p.id), { contactId: row.id as string });
    return;
  }
  const diff = changedFields(current, fields);
  if (!Object.keys(diff).length) r.counts.unchanged++;
  else {
    r.counts.updated++;
    if (dry) { ctx.log.info("Dry run: would update contact", { partnerId: p.id, contactId: current.id, ...diff }); return; }
    await ctx.data.contacts.update(current.id as string, diff);
  }
  if (!dry) await ctx.store.set(K.contact(p.id), { contactId: current.id as string });
}
```
In `firstImport`, before `return top;`:
```ts
  const parents = await linkedIds(r.ctx);
  if (parents.length) {
    await pages(r, [["parent_id", "in", parents], ["type", "=", "contact"], ["active", "=", true]], "id asc", syncPerson, { onPage: async (rows) => { top = newest(rows, top); } });
  }
```
In `incremental`, before `return top;`:
```ts
  const parents = await linkedIds(r.ctx);
  if (parents.length) {
    await pages(r, [["write_date", ">", since], ["type", "=", "contact"], ["parent_id", "in", parents]], "write_date asc, id asc", syncPerson, { archived: true, onPage: save });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest plugins/odoo-connector` then `pnpm exec tsc --noEmit`
Expected: PASS (all odoo-connector suites); tsc clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector/sync.ts plugins/odoo-connector/__tests__/people.test.ts
git commit -m "feat(odoo-connector): people sync to contacts

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Plugin definition, screens, messages, registry, docs

**Files:**
- Create: `plugins/odoo-connector/plugin.ts`, `plugins/odoo-connector/ui/{AdminSection,NeedsOwnerPage,AccountPanel}.tsx`, `plugins/odoo-connector/messages/{en,cz,de,uk}.json`
- Modify: `lib/plugins/plugins.generated.ts` (via `pnpm plugins:generate`)
- Create: `apps/docs/content/docs/admins/plugins/odoo-connector.mdx`; modify `apps/docs/content/docs/admins/plugins/meta.json` and `index.mdx`
- Test: `plugins/odoo-connector/__tests__/plugin.test.ts`, `plugins/odoo-connector/__tests__/ui.test.ts`; `__tests__/plugins/contract.test.ts` picks the plugin up automatically

**Interfaces:**
- Consumes: everything above; `AdminActionRegistration` (Task 1).
- Produces: plugin `odoo-connector` 0.1.0; pure UI helpers `needsOwner(ctx)` and `panelData(ctx, accountId)` in `ui/data.ts`.

- [ ] **Step 1: Write the failing tests**

`plugin.test.ts`:
```ts
import plugin from "../plugin";

it("declares a read-only Odoo connector", () => {
  expect([plugin.id, plugin.version, plugin.sdk]).toEqual(["odoo-connector", "0.1.0", "^0.2.2"]);
  expect(plugin.permissions).toEqual(["http", "accounts:read", "accounts:write", "contacts:read", "contacts:write", "users:read", "notify"]);
  expect(Object.keys(plugin.settings.shape)).toEqual(["url", "database", "syncMinutes", "defaultCountry", "dryRun"]);
  expect(Object.keys(plugin.secrets.shape)).toEqual(["apiKey"]);
  expect(plugin.extensions.crons.map((c) => [c.id, c.schedule])).toEqual([["sync", "*/5 * * * *"]]);
  expect(plugin.extensions.adminActions.map((a) => a.id)).toEqual(["test", "sync"]);
  expect(plugin.extensions.pages.map((p) => [p.path, p.roles, p.nav?.label])).toEqual([["needs-owner", ["manager", "admin"], "needsOwner.nav"]]);
  expect(plugin.extensions.accountPanels.map((p) => p.id)).toEqual(["odoo"]);
  expect(typeof plugin.onInstall).toBe("function");
});

it("never fails an install", async () => {
  const log: string[] = [];
  const ctx = { settings: { url: "https://x", database: "d", dryRun: true, syncMinutes: 15, defaultCountry: "CZ" }, secrets: { apiKey: "k" },
    http: { fetch: async () => new Response("{}", { status: 401 }) }, store: { get: async () => null, set: async () => {}, delete: async () => {}, list: async () => [] },
    log: { info: () => {}, warn: () => {}, debug: () => {}, error: (m: string) => log.push(m) }, notify: async () => {}, t: (k: string) => k } as never;
  await expect(plugin.onInstall!(ctx)).resolves.toBeUndefined();
  expect(log.some((m) => m.includes("Sync failed") || m.includes("Install sync failed"))).toBe(true);
});
```
(A 401 is not retried, so the test is fast; `runSync` catches it and `onInstall` resolves.)

`ui.test.ts`:
```ts
import { createTestContext } from "@nextcrm/plugin-sdk/testing";
import { needsOwner, panelData } from "../ui/data";
import { settingsSchema, type Ctx } from "../settings";
import { K } from "../store";

const S = settingsSchema.parse({ url: "https://odoo.example.com", database: "db" });

it("lists linked accounts without an owner, with the Odoo salesperson", async () => {
  const ctx = createTestContext({ pluginId: "odoo-connector", settings: S, data: { accounts: [
    { id: "a1", name: "No owner", assigned_to: null, deletedAt: null }, { id: "a2", name: "Owned", assigned_to: "u1", deletedAt: null },
  ] } }) as unknown as Ctx;
  await ctx.store.set(K.account("a1"), { partnerId: 1, syncedAt: "2026-10-13T08:00:00.000Z", salesperson: "Rep X" });
  await ctx.store.set(K.account("a2"), { partnerId: 2, syncedAt: "2026-10-13T08:00:00.000Z", salesperson: null });
  expect(await needsOwner(ctx)).toEqual([{ accountId: "a1", name: "No owner", salesperson: "Rep X" }]);
});

it("builds the panel only for linked accounts", async () => {
  const ctx = createTestContext({ pluginId: "odoo-connector", settings: S }) as unknown as Ctx;
  expect(await panelData(ctx, "a1")).toBeNull();
  await ctx.store.set(K.account("a1"), { partnerId: 42, syncedAt: "2026-10-13T08:00:00.000Z", salesperson: null, archived: true });
  expect(await panelData(ctx, "a1")).toEqual({ partnerId: 42, url: "https://odoo.example.com/odoo/contacts/42", syncedAt: "2026-10-13T08:00:00.000Z", archived: true, notCustomer: false });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec jest plugins/odoo-connector/__tests__/plugin.test.ts plugins/odoo-connector/__tests__/ui.test.ts`
Expected: FAIL (modules missing).

- [ ] **Step 3: Implement**

`ui/data.ts`:
```ts
import type { Ctx } from "../settings";
import type { AccountLink } from "../store";
import { K } from "../store";

export async function needsOwner(ctx: Ctx): Promise<{ accountId: string; name: string; salesperson: string | null }[]> {
  const out: { accountId: string; name: string; salesperson: string | null }[] = [];
  for (const e of await ctx.store.list("account:")) {
    const accountId = e.key.slice(8);
    const acc = await ctx.data.accounts.get(accountId);
    if (acc && acc.deletedAt == null && !acc.assigned_to) out.push({ accountId, name: String(acc.name ?? accountId), salesperson: (e.value as AccountLink).salesperson ?? null });
  }
  return out;
}

export async function panelData(ctx: Ctx, accountId: string) {
  const link = await ctx.store.get<AccountLink>(K.account(accountId));
  if (!link) return null;
  return {
    partnerId: link.partnerId,
    url: `${ctx.settings.url.replace(/\/+$/, "")}/odoo/contacts/${link.partnerId}`,
    syncedAt: link.syncedAt,
    archived: !!link.archived,
    notCustomer: !!link.notCustomer,
  };
}
```
`ui/AccountPanel.tsx`:
```tsx
import type { AccountSlotProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { panelData } from "./data";

export async function AccountPanel({ accountId, ctx }: AccountSlotProps<Settings, Secrets>) {
  const d = await panelData(ctx, accountId);
  if (!d) return null;
  return (
    <div className="space-y-1 rounded-md border p-3 text-sm">
      <div className="font-medium">Odoo</div>
      <a className="underline" href={d.url} target="_blank" rel="noreferrer">{ctx.t("panel.linked", { id: d.partnerId })}</a>
      <div className="text-muted-foreground">{ctx.t("panel.synced", { date: d.syncedAt.slice(0, 16).replace("T", " ") })}</div>
      <div className="text-muted-foreground">{ctx.t("panel.fields")}</div>
      {d.archived && <div className="text-destructive">{ctx.t("panel.archived")}</div>}
      {!d.archived && d.notCustomer && <div className="text-destructive">{ctx.t("panel.notCustomer")}</div>}
    </div>
  );
}
```
`ui/NeedsOwnerPage.tsx`:
```tsx
import type { PageProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { needsOwner } from "./data";

export async function NeedsOwnerPage({ ctx }: PageProps<Settings, Secrets>) {
  const rows = await needsOwner(ctx);
  return (
    <div className="space-y-3 p-4 text-sm">
      <h1 className="text-xl font-semibold">{ctx.t("needsOwner.title")}</h1>
      {rows.length === 0 ? <p className="text-muted-foreground">{ctx.t("needsOwner.empty")}</p> : (
        <table className="w-full">
          <thead><tr className="text-left"><th className="py-1">{ctx.t("needsOwner.account")}</th><th>{ctx.t("needsOwner.salesperson")}</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.accountId} className="border-t"><td className="py-1"><a className="underline" href={`/crm/accounts/${r.accountId}`}>{r.name}</a></td><td>{r.salesperson ?? "—"}</td></tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
```
`ui/AdminSection.tsx`:
```tsx
import type { AdminSectionProps } from "@nextcrm/plugin-sdk";
import type { Settings, Secrets } from "../settings";
import { K, type Conflict, type RunSummary } from "../store";
import { summaryText } from "../sync";

export async function AdminSection({ ctx }: AdminSectionProps<Settings, Secrets>) {
  const last = await ctx.store.get<RunSummary>(K.lastRun);
  const conflicts = (await ctx.store.list("conflict:")).map((e) => e.value as Conflict);
  const next = last ? new Date(Date.parse(last.at) + ctx.settings.syncMinutes * 60_000) : null;
  return (
    <div className="space-y-3 rounded-md border p-4 text-sm">
      {ctx.settings.dryRun && <p className="font-medium text-amber-600">{ctx.t("admin.dryRun")}</p>}
      <p>{ctx.t("admin.lastRun")}: {last ? `${last.at.slice(0, 16).replace("T", " ")} · ${summaryText(ctx, last)}` : ctx.t("admin.never")}</p>
      {next && <p>{ctx.t("admin.nextRun")}: {next.toISOString().slice(0, 16).replace("T", " ")}</p>}
      <div>
        <h3 className="mb-1 font-medium">{ctx.t("admin.conflicts")}</h3>
        {conflicts.length === 0 ? <p className="text-muted-foreground">{ctx.t("admin.conflictsEmpty")}</p> : (
          <ul className="space-y-1">{conflicts.map((c) => (
            <li key={c.partnerId}>
              {c.name} (#{c.partnerId}) · {ctx.t(`admin.reason.${c.reason}`)} · {c.candidates.map((id, i) => <a key={id} className="underline" href={`/crm/accounts/${id}`}>{i ? ", " : ""}{id.slice(0, 8)}</a>)}
            </li>
          ))}</ul>
        )}
      </div>
    </div>
  );
}
```
`plugin.ts`:
```ts
import { definePlugin } from "@nextcrm/plugin-sdk";
import { secretsSchema, settingsSchema } from "./settings";
import { jsonClient, testConnection } from "./odoo";
import { runSync, scheduledSync, summaryText } from "./sync";
import { AdminSection } from "./ui/AdminSection";
import { NeedsOwnerPage } from "./ui/NeedsOwnerPage";
import { AccountPanel } from "./ui/AccountPanel";

export default definePlugin({
  id: "odoo-connector",
  name: "Odoo connector",
  version: "0.1.0",
  sdk: "^0.2.2",
  description: "Imports customers and their people from an Odoo ERP and keeps them current. Reads only.",
  permissions: ["http", "accounts:read", "accounts:write", "contacts:read", "contacts:write", "users:read", "notify"],
  settings: settingsSchema,
  secrets: secretsSchema,
  extensions: (x) => {
    x.cron("sync", "*/5 * * * *", async (ctx) => { await scheduledSync(ctx, new Date()); });
    x.adminAction({ id: "test", label: "admin.test", handler: (ctx) => testConnection(ctx) });
    x.adminAction({ id: "sync", label: "admin.syncNow", handler: async (ctx) => summaryText(ctx, await runSync(ctx, jsonClient(ctx), new Date())) });
    x.accountPanel({ id: "odoo", component: AccountPanel });
    x.page({ path: "needs-owner", title: "needsOwner.title", component: NeedsOwnerPage, roles: ["manager", "admin"], nav: { label: "needsOwner.nav" } });
    x.adminSection(AdminSection);
  },
  // Ruling 7: an install never fails on Odoo; the cron imports on its first good run.
  onInstall: async (ctx) => {
    try {
      await runSync(ctx, jsonClient(ctx), new Date());
    } catch (e) {
      ctx.log.error(`Install sync failed: ${String(e)}`);
    }
  },
});
```
Check the `definePlugin` manifest type for `secrets` and the `ctx` generic of handlers; if `definePlugin` infers `PluginContext<Settings, Secrets>` from the schemas, the `Ctx` casts are unnecessary; otherwise cast `ctx as Ctx` in the four callbacks.

Messages — `messages/en.json`:
```json
{
  "name": "Odoo connector",
  "admin": {
    "test": "Test connection",
    "syncNow": "Sync now",
    "connected": "Connected to Odoo {version} as {user}",
    "dryRun": "Dry run is on: the sync only logs what it would change. Turn it off in the settings to import.",
    "lastRun": "Last run",
    "never": "not yet",
    "nextRun": "Next run",
    "counts": "{created} created, {updated} updated, {unchanged} unchanged, {skipped} skipped, {conflicts} conflicts, {failed} failed",
    "failed": "Failed: {error}",
    "conflicts": "Customers matching more than one account",
    "conflictsEmpty": "No conflicts.",
    "reason": { "number": "same registration number", "vat": "same VAT number" }
  },
  "needsOwner": {
    "title": "Imported accounts without an owner",
    "nav": "Needs owner",
    "empty": "Every imported account has an owner.",
    "account": "Account",
    "salesperson": "Salesperson in Odoo"
  },
  "panel": {
    "linked": "Linked to Odoo partner #{id}",
    "synced": "Last synced {date} UTC",
    "fields": "Odoo controls: name, registration number, VAT, billing address, email, phone.",
    "archived": "Archived in Odoo.",
    "notCustomer": "No longer a customer in Odoo."
  },
  "mail": {
    "failingSubject": "Odoo sync is failing",
    "failingText": "The Odoo sync failed three times in a row. Last error: {error}"
  }
}
```
`cz.json` (same keys):
```json
{
  "name": "Napojení na Odoo",
  "admin": {
    "test": "Otestovat spojení",
    "syncNow": "Synchronizovat teď",
    "connected": "Spojeno s Odoo {version} jako {user}",
    "dryRun": "Zkušební režim je zapnutý: synchronizace jen zapisuje do logu, co by změnila. Pro import ho vypněte v nastavení.",
    "lastRun": "Poslední běh",
    "never": "zatím ne",
    "nextRun": "Další běh",
    "counts": "{created} vytvořeno, {updated} upraveno, {unchanged} beze změny, {skipped} přeskočeno, {conflicts} konfliktů, {failed} chyb",
    "failed": "Chyba: {error}",
    "conflicts": "Zákazníci odpovídající více účtům",
    "conflictsEmpty": "Žádné konflikty.",
    "reason": { "number": "stejné IČO", "vat": "stejné DIČ" }
  },
  "needsOwner": {
    "title": "Importované účty bez vlastníka",
    "nav": "Bez vlastníka",
    "empty": "Všechny importované účty mají vlastníka.",
    "account": "Účet",
    "salesperson": "Obchodník v Odoo"
  },
  "panel": {
    "linked": "Propojeno s partnerem Odoo #{id}",
    "synced": "Naposledy synchronizováno {date} UTC",
    "fields": "Odoo řídí: název, IČO, DIČ, fakturační adresu, e-mail, telefon.",
    "archived": "V Odoo archivováno.",
    "notCustomer": "V Odoo už není zákazník."
  },
  "mail": {
    "failingSubject": "Synchronizace s Odoo selhává",
    "failingText": "Synchronizace s Odoo třikrát po sobě selhala. Poslední chyba: {error}"
  }
}
```
`de.json`:
```json
{
  "name": "Odoo-Anbindung",
  "admin": {
    "test": "Verbindung testen",
    "syncNow": "Jetzt synchronisieren",
    "connected": "Verbunden mit Odoo {version} als {user}",
    "dryRun": "Testlauf ist an: Die Synchronisierung protokolliert nur, was sie ändern würde. Zum Importieren in den Einstellungen ausschalten.",
    "lastRun": "Letzter Lauf",
    "never": "noch nicht",
    "nextRun": "Nächster Lauf",
    "counts": "{created} angelegt, {updated} geändert, {unchanged} unverändert, {skipped} übersprungen, {conflicts} Konflikte, {failed} Fehler",
    "failed": "Fehlgeschlagen: {error}",
    "conflicts": "Kunden, die zu mehreren Konten passen",
    "conflictsEmpty": "Keine Konflikte.",
    "reason": { "number": "gleiche Registernummer", "vat": "gleiche USt-IdNr." }
  },
  "needsOwner": {
    "title": "Importierte Konten ohne Verantwortlichen",
    "nav": "Ohne Verantwortlichen",
    "empty": "Alle importierten Konten haben einen Verantwortlichen.",
    "account": "Konto",
    "salesperson": "Verkäufer in Odoo"
  },
  "panel": {
    "linked": "Verknüpft mit Odoo-Partner #{id}",
    "synced": "Zuletzt synchronisiert {date} UTC",
    "fields": "Odoo steuert: Name, Registernummer, USt-IdNr., Rechnungsadresse, E-Mail, Telefon.",
    "archived": "In Odoo archiviert.",
    "notCustomer": "In Odoo kein Kunde mehr."
  },
  "mail": {
    "failingSubject": "Odoo-Synchronisierung schlägt fehl",
    "failingText": "Die Odoo-Synchronisierung ist dreimal hintereinander fehlgeschlagen. Letzter Fehler: {error}"
  }
}
```
`uk.json`:
```json
{
  "name": "Підключення до Odoo",
  "admin": {
    "test": "Перевірити з'єднання",
    "syncNow": "Синхронізувати зараз",
    "connected": "Підключено до Odoo {version} як {user}",
    "dryRun": "Тестовий режим увімкнено: синхронізація лише записує в журнал, що змінила б. Щоб імпортувати, вимкніть його в налаштуваннях.",
    "lastRun": "Останній запуск",
    "never": "ще не було",
    "nextRun": "Наступний запуск",
    "counts": "{created} створено, {updated} оновлено, {unchanged} без змін, {skipped} пропущено, {conflicts} конфліктів, {failed} помилок",
    "failed": "Помилка: {error}",
    "conflicts": "Клієнти, що відповідають кільком обліковим записам",
    "conflictsEmpty": "Конфліктів немає.",
    "reason": { "number": "однаковий реєстраційний номер", "vat": "однаковий номер ПДВ" }
  },
  "needsOwner": {
    "title": "Імпортовані облікові записи без відповідального",
    "nav": "Без відповідального",
    "empty": "Усі імпортовані облікові записи мають відповідального.",
    "account": "Обліковий запис",
    "salesperson": "Продавець в Odoo"
  },
  "panel": {
    "linked": "Пов'язано з партнером Odoo #{id}",
    "synced": "Остання синхронізація {date} UTC",
    "fields": "Odoo керує: назва, реєстраційний номер, номер ПДВ, адреса для рахунків, e-mail, телефон.",
    "archived": "Архівовано в Odoo.",
    "notCustomer": "В Odoo більше не клієнт."
  },
  "mail": {
    "failingSubject": "Синхронізація з Odoo не вдається",
    "failingText": "Синхронізація з Odoo тричі поспіль завершилася помилкою. Остання помилка: {error}"
  }
}
```
Registry: `pnpm plugins:generate` (adds the odoo-connector entries to `lib/plugins/plugins.generated.ts`).

Docs: `apps/docs/content/docs/admins/plugins/odoo-connector.mdx` with frontmatter `title: Odoo connector` and sections: what it does (customers and people in, read-only, every `syncMinutes`), before you start (an Odoo user with an API key and read access to contacts and users; JSON-2 needs Odoo 18 or later), install and settings (table of the five settings and the API key secret), dry run (default on; check the log, then turn it off), matching (link, registration number, VAT; conflicts list), owners and the "Needs owner" page, what Odoo controls (the field list) and what it never touches, archived customers, failures and the alert email. Add `"odoo-connector"` to `admins/plugins/meta.json` pages and one line to `admins/plugins/index.mdx`. No `{` `}` in the prose (MDX).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec jest plugins/odoo-connector __tests__/plugins` then `pnpm exec tsc --noEmit` and `pnpm lint`
Expected: PASS (the contract test now covers `odoo-connector`: SDK range, settings/secrets types, four locales with identical keys, page and action label keys); tsc and lint clean.

- [ ] **Step 5: Commit**

```bash
git add plugins/odoo-connector lib/plugins/plugins.generated.ts apps/docs/content/docs/admins/plugins
git commit -m "feat(odoo-connector): plugin definition, screens, messages and docs

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Verification, local run and live dry run

- [ ] **Step 1: Full suite, types, lint, build**

Run: `pnpm exec jest 2>&1 | tail -8 && pnpm exec tsc --noEmit && pnpm lint`
Expected: only the 6 baseline failures; clean. Build with the CI dummy env (exported by a Python script from `.github/workflows/ci.yml`): `pnpm exec prisma generate && pnpm exec next build` → succeeds.

- [ ] **Step 2: Live dry run, then a real run into the LOCAL database (needs Pavel's explicit OK; Odoo is only read)**

Local dev on `:3001` (local DB on 5433, `RESEND_API_KEY` unset, a throwaway Inngest container for install, crons and admin actions). As admin in Chrome:
1. Install `odoo-connector` with the target Odoo's URL and database, the technical user's API key (or Pavel's existing read key), `dryRun` on.
2. Test connection → version and user name.
3. Sync now → the log lists would-create / would-update lines; compare the customer count with the OXO plan's facts (about 80 customers, about 75 with a registration number or VAT); note conflicts.
4. Turn `dryRun` off → Sync now → accounts and contacts appear in the **local** CRM; Needs owner lists the accounts without a matched salesperson; an account shows the Odoo panel with the partner link.
5. Sync now again → 0 created (idempotent).
6. Uninstall the plugin locally and delete the imported local test accounts only if Pavel asks (they are in the local dev database only).

Nothing is ever written to Odoo: the client only calls `fields_get`, `search_read`, `read`, `context_get` and `version_info`.

- [ ] **Step 3: Record pass/fail per check in the ledger; any bug gets a failing test first**

- [ ] **Step 4: Record results; hand off to finishing-a-development-branch**
