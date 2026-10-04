# Plugin System v0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the plugin host and `@nextcrm/plugin-sdk` v0 so that trusted, build-time-bundled plugins can be installed, enabled, disabled and uninstalled per instance from the admin UI.

**Architecture:** Plugins live in `plugins/<id>/` (public) and optionally `plugins-private/<id>/` (private submodule). A Node script generates a static registry (`lib/plugins/plugins.generated.ts`). The host (`lib/plugins/`) reads per-instance state from `InstalledPlugin`, builds a typed `ctx` for every plugin call, enforces rules on CRM writes through a Prisma Client extension wrapped around the shared `prismadb`, registers plugin cron/event/after-write functions with Inngest, and renders plugin UI in account tabs, account panels, plugin pages and the admin area.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Prisma 7 (pg adapter), PostgreSQL, Inngest 4, next-intl 4, zod 4, Jest 30 + ts-jest, shadcn/ui, Resend.

**Spec:** `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (Task 1 amends it where the codebase forced a different choice).

## Global Constraints

- SDK version constant: `SDK_VERSION = "0.1.0"`. Manifest `sdk` field supports caret ranges only (`^x.y.z`).
- Plugin id: `/^[a-z][a-z0-9-]{1,48}$/`, stable forever. Plugin version: semver `x.y.z`.
- Plugins import only `@nextcrm/plugin-sdk`, their own files, npm packages and `react`. Core never imports `plugins/` or `plugins-private/` except `lib/plugins/plugins.generated.ts`.
- Locales: `en`, `cz`, `de`, `uk`; plugin messages under `plugins.<id>.*`; fallback `en`.
- Rule timeout: 500 ms. `onError` default `"allow"`. Rule `priority` default 100. Recursion depth cap: 3.
- `ctx.http` default timeout 15 000 ms; private hosts blocked unless `PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS=true`.
- `ctx.store` value max 256 KB (UTF-8 length of `JSON.stringify(value)`).
- `InstalledPlugin` state cache TTL: 10 s. `PluginLog` retention: 30 days. Admin log view: last 200 lines.
- Inngest retries for plugin functions: 3.
- Secrets are encrypted with `encrypt`/`decrypt` from `lib/email-crypto.ts` and never sent to the browser.
- Watched CRM models in v0: `crm_Accounts`→`account`, `crm_Contacts`→`contact`, `crm_Leads`→`lead`, `crm_Opportunities`→`opportunity`.
- No behaviour change for instances with zero installed plugins; the registry ships empty in this plan.
- Tests: Jest, files in `__tests__/**/*.test.ts(x)`; run with `pnpm exec jest <path>`. Typecheck: `pnpm exec tsc --noEmit`.

## Review Focus

1. **Stored settings no longer match the schema after a plugin upgrade** (field renamed, new required field) → the plugin must still get a context: invalid stored settings are replaced by schema defaults field-by-field and a `warn` log line is written, never a crash. Test in Task 5.
2. **Plugin code removed from the image while its `InstalledPlugin` row remains** → app boots, the plugin shows as "missing" in admin, all its extensions are inert, uninstall deletes its data without calling `onUninstall`. Tests in Tasks 4 and 10.
3. **A plugin writes through `ctx.data` to an entity it also guards with a rule** → its own rule must not run (no self-recursion), other plugins' rules do run, depth > 3 throws. Test in Task 6.
4. **Secrets leaking to the browser** → admin detail page and settings action results expose only `{ [key]: boolean }` "is set" flags. Test in Task 10.
5. **A rule with `onError: "block"` hangs or throws** → the write is rejected within ~500 ms with the core "rule unavailable" message, not left hanging and not silently allowed. Test in Task 6.

---

## File Structure

```
packages/plugin-sdk/src/
  index.ts            re-exports public SDK
  types.ts            all public types (Actor, Entity, PluginContext, extensions, manifest)
  version.ts          SDK_VERSION, parseVersion, compareVersions, satisfiesSdkRange
  define.ts           definePlugin, allow/reject/modify, ExtensionBuilder
  testing.ts          createTestContext (in-memory ctx for plugin unit tests)
lib/prisma-base.ts    PrismaClient singleton (moved from lib/prisma.ts)
lib/prisma.ts         prismadb = withPluginRules(prismaBase)
lib/plugins/
  plugins.generated.ts  generated registry (committed; regenerated in Docker build)
  registry.ts         getRegistry(), RegisteredPlugin, findPlugin()
  errors.ts           PluginRuleError, PluginPermissionError, PluginStoreError
  state.ts            InstalledPlugin cache, getPluginStates(), getEnabledPlugins(), invalidatePluginCache()
  settings.ts         describeSettingsSchema(), parseStoredSettings(), encryptSecrets(), decryptSecrets()
  lifecycle.ts        install/enable/disable/saveSettings/uninstall/summary/export
  actor.ts            AsyncLocalStorage actor context, runAsActor(), resolveActor()
  context.ts          createPluginContext()
  data-api.ts         ctx.data implementation
  store.ts            ctx.store implementation
  log.ts              ctx.log implementation + writePluginLog()
  http.ts             ctx.http implementation
  notify.ts           ctx.notify implementation (email via Resend)
  i18n.ts             mergePluginMessages(), translatePluginMessage()
  rules.ts            runBeforeRules(), collectRules(), afterTargets()
  prisma-extension.ts withPluginRules()
  action-errors.ts    pluginRuleErrorMessage() for server actions
  inngest.ts          buildPluginFunctions(), pluginInstallFunction, pluginLogRetention
  upgrade.ts          runPluginUpgrades()
  slots.ts            getAccountTabs(), getAccountPanels(), findPluginPage(), getCompanyRegistryProviders()
  ui/PluginErrorBoundary.tsx
scripts/plugins/generate-registry.mjs
instrumentation.ts
app/[locale]/(routes)/admin/plugins/page.tsx
app/[locale]/(routes)/admin/plugins/[pluginId]/page.tsx
app/[locale]/(routes)/admin/plugins/_actions/plugins.ts
app/[locale]/(routes)/admin/plugins/_components/{PluginSettingsForm,PluginStatusControls,UninstallDialog,PluginLogTable}.tsx
app/api/admin/plugins/[pluginId]/export/route.ts
app/[locale]/(routes)/p/[pluginId]/[...path]/page.tsx
actions/crm/accounts/lookup-company.ts
docs/plugins/README.md
```

Modified: `tsconfig.json`, `jest.config.ts`, `eslint.config.mjs`, `package.json`, `Dockerfile`, `.gitignore`, `prisma/schema.prisma`, `lib/audit-log.ts`, `i18n/request.ts`, `locales/{en,cz,de,uk}.json`, `app/api/inngest/route.ts`, `app/api/mcp/[transport]/route.ts`, `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx`, `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx`, `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx`, the create/update/delete server actions for accounts, contacts, leads and opportunities, `docs/superpowers/specs/2026-10-04-plugin-system-design.md`.

---

### Task 1: Spec amendments

The codebase review forced five deviations from the approved spec. Record them before code.

**Files:**
- Modify: `docs/superpowers/specs/2026-10-04-plugin-system-design.md`

- [ ] **Step 1: Edit § 4** — replace "writes `plugins.generated.ts` … It runs before `next build`, `next dev` and tests (`prebuild`, `predev`, `pretest` scripts)." and "generated, git-ignored" with:

```markdown
- `scripts/plugins/generate-registry.mjs` (plain Node, no tsx) scans `plugins/*/plugin.ts(x)` and `plugins-private/*/plugin.ts(x)` and writes `lib/plugins/plugins.generated.ts`. The file is **committed** for public plugins (CI runs `tsc` without a build step), a Jest test fails when it is stale, and the Dockerfile regenerates it before `next build` so private plugins are included in our image.
- `@nextcrm/plugin-sdk` is a TypeScript path alias to `packages/plugin-sdk/src` (resolves open question 1); no pnpm workspace.
```

- [ ] **Step 2: Edit § 6 "Account side panel"** row to say: "Card rendered in the account overview stack directly below the basic info card (the page has no sidebar)."
- [ ] **Step 3: Edit § 6 "Event handler"** row: replace "plus new core events added in v0: `crm/account.deleted`, `crm/order.status-changed`" with "plus `crm/account.deleted` added in v0 (`crm/order.status-changed` ships with the orders feature)".
- [ ] **Step 4: Edit § 8 table**:
  - `ctx.data` row → "CRM read/write for the entities in § 6 plus activities, users and products (read). Checked against manifest permissions. Plugins are trusted, so there is no per-user role scoping; writes run as actor `plugin` and pass through other plugins' rules."
  - `ctx.notify` row → "E-mail (Resend) to users or roles. In-app notifications follow when the core has a notification centre."
  - `ctx.http` row → append "Private hosts are blocked unless `PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS=true`."
- [ ] **Step 5: Edit § 10 Install row**: replace "(as an Inngest job if it may be long, e.g. first import)" with "(always as the Inngest function `plugin-lifecycle-install`, so long first imports do not block the request)".
- [ ] **Step 6: Edit § 7 bullets**:
  - Actor context → "The MCP route and plugin Inngest functions set the actor explicitly. Server actions are not wrapped: `resolveActor()` falls back to the session user, then to `system` outside a request."
  - Known gaps → "The v0 audit found no nested writes to watched models (only `documents → accounts` junction rows) and only read-only raw SQL on them. No lint rule in v0; reviewers check new nested writes."
- [ ] **Step 7: Edit § 9** last-but-one bullet → "When a CRM record is hard-deleted, its `PluginData` rows are deleted right after the write (best effort, logged on failure)."
- [ ] **Step 8: Edit § 11** last bullet → "Admin page shows status, pending upgrade and the last 200 log lines. Job runs and error rates are visible in the Inngest dashboard; a per-plugin run summary is v1."
- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/specs/2026-10-04-plugin-system-design.md
git commit -m "docs(plugins): amend spec after codebase review"
```

---

### Task 2: SDK package — types, versions, definePlugin

**Files:**
- Create: `packages/plugin-sdk/src/types.ts`, `packages/plugin-sdk/src/version.ts`, `packages/plugin-sdk/src/define.ts`, `packages/plugin-sdk/src/index.ts`
- Modify: `tsconfig.json` (paths), `jest.config.ts` (moduleNameMapper)
- Test: `packages/plugin-sdk/__tests__/version.test.ts`, `packages/plugin-sdk/__tests__/define.test.ts`

**Interfaces:**
- Produces (used by every later task): all types below; `SDK_VERSION`, `parseVersion(v): [number, number, number]`, `compareVersions(a, b): -1|0|1`, `satisfiesSdkRange(range, version?): boolean`; `definePlugin(manifest): PluginDefinition`; `allow()`, `reject(messageKey, params?)`, `modify(patch)`; `PERMISSIONS`, `ENTITIES`, `LOCALES`.

- [ ] **Step 1: Add the path alias**

In `tsconfig.json` `compilerOptions.paths`, add before `"@/*"`:

```json
"@nextcrm/plugin-sdk": ["./packages/plugin-sdk/src/index.ts"],
"@nextcrm/plugin-sdk/testing": ["./packages/plugin-sdk/src/testing.ts"],
```

In `jest.config.ts` `moduleNameMapper`, add as the first two entries:

```ts
"^@nextcrm/plugin-sdk$": "<rootDir>/packages/plugin-sdk/src/index.ts",
"^@nextcrm/plugin-sdk/testing$": "<rootDir>/packages/plugin-sdk/src/testing.ts",
```

Also add `"<rootDir>/packages/**/__tests__/**/*.test.ts"` coverage by confirming `testMatch` (`**/__tests__/**/*.test.ts`) already matches it — it does; no change.

- [ ] **Step 2: Write `packages/plugin-sdk/src/types.ts`**

```ts
import type { ReactNode } from "react";
import type { z } from "zod";

export const LOCALES = ["en", "cz", "de", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

export type Role = "user" | "manager" | "admin";

export const ENTITIES = ["account", "contact", "lead", "opportunity"] as const;
export type Entity = (typeof ENTITIES)[number];

export type BeforeOperation = "beforeCreate" | "beforeUpdate" | "beforeDelete";
export type AfterOperation = "created" | "updated" | "deleted";

export const PERMISSIONS = [
  "accounts:read", "accounts:write",
  "contacts:read", "contacts:write",
  "leads:read", "leads:write",
  "opportunities:read", "opportunities:write",
  "activities:read", "users:read", "products:read",
  "notify", "http",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type Actor =
  | { type: "user"; userId: string; role: Role }
  | { type: "token"; userId: string; role: Role }
  | { type: "system" }
  | { type: "plugin"; pluginId: string };

export type RecordData = Record<string, unknown>;

export interface FindArgs {
  where?: RecordData;
  orderBy?: RecordData | RecordData[];
  take?: number;
  skip?: number;
}

export interface ReadApi {
  get(id: string): Promise<RecordData | null>;
  find(args?: FindArgs): Promise<RecordData[]>;
}

export interface EntityApi extends ReadApi {
  create(data: RecordData): Promise<RecordData>;
  update(id: string, data: RecordData): Promise<RecordData>;
}

export interface DataApi {
  accounts: EntityApi;
  contacts: EntityApi;
  leads: EntityApi;
  opportunities: EntityApi;
  activities: Pick<ReadApi, "find">;
  users: ReadApi;
  products: ReadApi;
}

export interface StoreEntry { key: string; value: unknown }

export interface RecordStore {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<StoreEntry[]>;
}

export interface PluginStore extends RecordStore {
  forRecord(entity: Entity, id: string): RecordStore;
}

export interface PluginLogger {
  debug(message: string, context?: RecordData): void;
  info(message: string, context?: RecordData): void;
  warn(message: string, context?: RecordData): void;
  error(message: string, context?: RecordData): void;
}

export interface PluginHttp {
  fetch(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<Response>;
}

export interface NotifyInput {
  userIds?: string[];
  roles?: Role[];
  subject: string;
  text: string;
}

export type MessageParams = Record<string, string | number>;

export interface PluginContext<S = RecordData, K = RecordData> {
  plugin: { id: string; version: string };
  actor: Actor;
  locale: Locale;
  settings: S;
  secrets: K;
  data: DataApi;
  store: PluginStore;
  http: PluginHttp;
  notify(input: NotifyInput): Promise<void>;
  log: PluginLogger;
  t(key: string, params?: MessageParams): string;
}

export type RuleResult =
  | { kind: "allow" }
  | { kind: "reject"; messageKey: string; params?: MessageParams }
  | { kind: "modify"; patch: RecordData };

export interface RuleInput {
  entity: Entity;
  operation: BeforeOperation;
  recordId: string | null;
  data: RecordData;
  existing: RecordData | null;
}

export type RuleHandler<S = RecordData, K = RecordData> =
  (input: RuleInput, ctx: PluginContext<S, K>) => RuleResult | Promise<RuleResult>;

export interface RuleOptions { onError?: "block" | "allow"; priority?: number }

export interface AfterInput { entity: Entity; operation: AfterOperation; recordId: string }
export type AfterHandler<S = RecordData, K = RecordData> =
  (input: AfterInput, ctx: PluginContext<S, K>) => Promise<void> | void;

export type EventHandler<S = RecordData, K = RecordData> =
  (data: RecordData, ctx: PluginContext<S, K>) => Promise<void> | void;

export type JobHandler<S = RecordData, K = RecordData> =
  (ctx: PluginContext<S, K>) => Promise<void> | void;

export interface AccountSlotProps<S = RecordData, K = RecordData> {
  accountId: string;
  ctx: PluginContext<S, K>;
}

export interface PageProps<S = RecordData, K = RecordData> {
  path: string[];
  searchParams: Record<string, string | string[] | undefined>;
  ctx: PluginContext<S, K>;
}

export interface AdminSectionProps<S = RecordData, K = RecordData> { ctx: PluginContext<S, K> }

export type ServerComponent<P> = (props: P) => ReactNode | Promise<ReactNode>;

export interface CompanyRecord {
  name: string;
  registrationNumber: string;
  country: string;           // ISO 3166-1 alpha-2, upper case
  vat?: string;
  street?: string;
  city?: string;
  postalCode?: string;
}

export interface CompanyRegistryProvider<S = RecordData, K = RecordData> {
  countries: string[];       // ISO 3166-1 alpha-2, upper case
  lookup(registrationNumber: string, country: string, ctx: PluginContext<S, K>): Promise<CompanyRecord | null>;
  validateVat?(vat: string, ctx: PluginContext<S, K>): Promise<boolean>;
}

export interface RuleRegistration { entity: Entity; operation: BeforeOperation; handler: RuleHandler<any, any>; onError: "block" | "allow"; priority: number }
export interface AfterRegistration { entity: Entity; operation: AfterOperation; handler: AfterHandler<any, any> }
export interface EventRegistration { event: string; handler: EventHandler<any, any> }
export interface CronRegistration { id: string; schedule: string; handler: JobHandler<any, any> }
export interface AccountTabRegistration { id: string; title: string; component: ServerComponent<AccountSlotProps<any, any>>; roles: Role[] }
export interface AccountPanelRegistration { id: string; component: ServerComponent<AccountSlotProps<any, any>>; roles: Role[] }
export interface PageRegistration { path: string; title: string; component: ServerComponent<PageProps<any, any>>; roles: Role[] }

export interface PluginExtensions {
  rules: RuleRegistration[];
  afters: AfterRegistration[];
  events: EventRegistration[];
  crons: CronRegistration[];
  accountTabs: AccountTabRegistration[];
  accountPanels: AccountPanelRegistration[];
  pages: PageRegistration[];
  adminSections: ServerComponent<AdminSectionProps<any, any>>[];
  companyRegistries: CompanyRegistryProvider<any, any>[];
}

export interface ExtensionBuilder<S, K> {
  rule(entity: Entity, operation: BeforeOperation, handler: RuleHandler<S, K>, options?: RuleOptions): void;
  after(entity: Entity, operation: AfterOperation, handler: AfterHandler<S, K>): void;
  on(event: string, handler: EventHandler<S, K>): void;
  cron(id: string, schedule: string, handler: JobHandler<S, K>): void;
  accountTab(tab: { id: string; title: string; component: ServerComponent<AccountSlotProps<S, K>>; roles?: Role[] }): void;
  accountPanel(panel: { id: string; component: ServerComponent<AccountSlotProps<S, K>>; roles?: Role[] }): void;
  page(page: { path: string; title: string; component: ServerComponent<PageProps<S, K>>; roles?: Role[] }): void;
  adminSection(component: ServerComponent<AdminSectionProps<S, K>>): void;
  companyRegistry(provider: CompanyRegistryProvider<S, K>): void;
}

type AnyObject = z.ZodObject<any>;

export interface PluginManifest<S extends AnyObject, K extends AnyObject> {
  id: string;
  name: string;
  version: string;
  sdk: string;
  description: string;
  permissions: Permission[];
  settings?: S;
  secrets?: K;
  extensions: (x: ExtensionBuilder<z.infer<S>, z.infer<K>>) => void;
  onInstall?: (ctx: PluginContext<z.infer<S>, z.infer<K>>) => Promise<void> | void;
  onUpgrade?: (ctx: PluginContext<z.infer<S>, z.infer<K>>, fromVersion: string) => Promise<void> | void;
  onUninstall?: (ctx: PluginContext<z.infer<S>, z.infer<K>>) => Promise<void> | void;
}

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  sdk: string;
  description: string;
  permissions: Permission[];
  settings: AnyObject;
  secrets: AnyObject;
  extensions: PluginExtensions;
  onInstall?: (ctx: PluginContext<any, any>) => Promise<void> | void;
  onUpgrade?: (ctx: PluginContext<any, any>, fromVersion: string) => Promise<void> | void;
  onUninstall?: (ctx: PluginContext<any, any>) => Promise<void> | void;
}
```

- [ ] **Step 3: Write the failing version test** `packages/plugin-sdk/__tests__/version.test.ts`

```ts
import { compareVersions, parseVersion, satisfiesSdkRange, SDK_VERSION } from "../src/version";

describe("version helpers", () => {
  it("parses semver", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
    expect(() => parseVersion("1.2")).toThrow("Invalid version");
  });
  it("compares versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("1.10.0", "1.9.9")).toBe(1);
    expect(compareVersions("0.1.0", "0.2.0")).toBe(-1);
  });
  it("checks caret ranges like npm", () => {
    expect(SDK_VERSION).toBe("0.1.0");
    expect(satisfiesSdkRange("^0.1.0", "0.1.5")).toBe(true);
    expect(satisfiesSdkRange("^0.1.0", "0.2.0")).toBe(false);   // 0.x: minor is breaking
    expect(satisfiesSdkRange("^1.2.0", "1.9.0")).toBe(true);
    expect(satisfiesSdkRange("^1.2.0", "1.1.9")).toBe(false);
    expect(satisfiesSdkRange("^1.2.0", "2.0.0")).toBe(false);
    expect(satisfiesSdkRange(">=0.1.0", "0.1.0")).toBe(false);  // only caret supported
  });
});
```

- [ ] **Step 4: Run it — expect FAIL** (`Cannot find module '../src/version'`)

Run: `pnpm exec jest packages/plugin-sdk/__tests__/version.test.ts`

- [ ] **Step 5: Write `packages/plugin-sdk/src/version.ts`**

```ts
export const SDK_VERSION = "0.1.0";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export function parseVersion(version: string): [number, number, number] {
  const m = SEMVER.exec(version);
  if (!m) throw new Error(`Invalid version: ${version}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

export function satisfiesSdkRange(range: string, version: string = SDK_VERSION): boolean {
  if (!range.startsWith("^")) return false;
  const [rMaj, rMin, rPatch] = parseVersion(range.slice(1));
  const [vMaj, vMin, vPatch] = parseVersion(version);
  if (compareVersions(version, range.slice(1)) < 0) return false;
  if (rMaj > 0) return vMaj === rMaj;
  if (rMin > 0) return vMaj === 0 && vMin === rMin;
  return vMaj === 0 && vMin === 0 && vPatch === rPatch;
}
```

- [ ] **Step 6: Run it — expect PASS.** `pnpm exec jest packages/plugin-sdk/__tests__/version.test.ts`

- [ ] **Step 7: Write the failing define test** `packages/plugin-sdk/__tests__/define.test.ts`

```ts
import { z } from "zod";
import { allow, definePlugin, modify, reject } from "../src/define";

const base = {
  id: "demo-plugin",
  name: "Demo",
  version: "1.0.0",
  sdk: "^0.1.0",
  description: "Demo",
  permissions: ["accounts:read" as const],
};

describe("definePlugin", () => {
  it("collects extensions with defaults", () => {
    const Tab = () => null;
    const def = definePlugin({
      ...base,
      settings: z.object({ days: z.number().default(90) }),
      extensions: (x) => {
        x.rule("account", "beforeCreate", () => allow());
        x.rule("lead", "beforeUpdate", () => allow(), { onError: "block", priority: 10 });
        x.cron("nightly", "0 3 * * *", async () => {});
        x.on("crm/account.saved", async () => {});
        x.accountTab({ id: "info", title: "tab.title", component: Tab });
      },
    });
    expect(def.extensions.rules).toHaveLength(2);
    expect(def.extensions.rules[0]).toMatchObject({ entity: "account", onError: "allow", priority: 100 });
    expect(def.extensions.rules[1]).toMatchObject({ onError: "block", priority: 10 });
    expect(def.extensions.accountTabs[0].roles).toEqual(["user", "manager", "admin"]);
    expect(def.secrets.shape).toEqual({});
  });

  it("rejects invalid ids, versions, ranges and duplicates", () => {
    const noop = () => {};
    expect(() => definePlugin({ ...base, id: "Bad_Id", extensions: noop })).toThrow("Invalid plugin id");
    expect(() => definePlugin({ ...base, version: "1.0", extensions: noop })).toThrow("Invalid version");
    expect(() => definePlugin({ ...base, sdk: ">=0.1.0", extensions: noop })).toThrow("sdk must be a caret range");
    expect(() => definePlugin({ ...base, permissions: ["root" as any], extensions: noop })).toThrow("Unknown permission");
    expect(() =>
      definePlugin({ ...base, extensions: (x) => { x.cron("a", "* * * * *", noop); x.cron("a", "* * * * *", noop); } }),
    ).toThrow("Duplicate cron id: a");
    expect(() =>
      definePlugin({ ...base, extensions: (x) => { x.on("e/x", noop); x.on("e/x", noop); } }),
    ).toThrow("Duplicate event handler: e/x");
  });

  it("builds rule results", () => {
    expect(allow()).toEqual({ kind: "allow" });
    expect(reject("err.taken", { date: "1. 1." })).toEqual({ kind: "reject", messageKey: "err.taken", params: { date: "1. 1." } });
    expect(modify({ name: "X" })).toEqual({ kind: "modify", patch: { name: "X" } });
  });
});
```

- [ ] **Step 8: Run it — expect FAIL** (`Cannot find module '../src/define'`).

- [ ] **Step 9: Write `packages/plugin-sdk/src/define.ts`**

```ts
import { z } from "zod";
import { parseVersion } from "./version";
import {
  PERMISSIONS, type ExtensionBuilder, type MessageParams, type PluginDefinition,
  type PluginExtensions, type PluginManifest, type RecordData, type Role, type RuleResult,
} from "./types";

const ID = /^[a-z][a-z0-9-]{1,48}$/;
const ALL_ROLES: Role[] = ["user", "manager", "admin"];

export const allow = (): RuleResult => ({ kind: "allow" });
export const reject = (messageKey: string, params?: MessageParams): RuleResult =>
  params ? { kind: "reject", messageKey, params } : { kind: "reject", messageKey };
export const modify = (patch: RecordData): RuleResult => ({ kind: "modify", patch });

function unique(seen: Set<string>, value: string, label: string) {
  if (seen.has(value)) throw new Error(`${label}: ${value}`);
  seen.add(value);
}

export function definePlugin<S extends z.ZodObject<any>, K extends z.ZodObject<any>>(
  manifest: PluginManifest<S, K>,
): PluginDefinition {
  if (!ID.test(manifest.id)) throw new Error(`Invalid plugin id: ${manifest.id}`);
  parseVersion(manifest.version);
  if (!manifest.sdk.startsWith("^")) throw new Error("sdk must be a caret range, e.g. ^0.1.0");
  parseVersion(manifest.sdk.slice(1));
  for (const p of manifest.permissions) {
    if (!(PERMISSIONS as readonly string[]).includes(p)) throw new Error(`Unknown permission: ${p}`);
  }

  const ext: PluginExtensions = {
    rules: [], afters: [], events: [], crons: [], accountTabs: [], accountPanels: [],
    pages: [], adminSections: [], companyRegistries: [],
  };
  const ids = { cron: new Set<string>(), event: new Set<string>(), tab: new Set<string>(), panel: new Set<string>(), page: new Set<string>() };

  const x: ExtensionBuilder<z.infer<S>, z.infer<K>> = {
    rule: (entity, operation, handler, options) =>
      ext.rules.push({ entity, operation, handler, onError: options?.onError ?? "allow", priority: options?.priority ?? 100 }),
    after: (entity, operation, handler) => ext.afters.push({ entity, operation, handler }),
    on: (event, handler) => { unique(ids.event, event, "Duplicate event handler"); ext.events.push({ event, handler }); },
    cron: (id, schedule, handler) => { unique(ids.cron, id, "Duplicate cron id"); ext.crons.push({ id, schedule, handler }); },
    accountTab: (tab) => { unique(ids.tab, tab.id, "Duplicate account tab id"); ext.accountTabs.push({ ...tab, roles: tab.roles ?? ALL_ROLES }); },
    accountPanel: (panel) => { unique(ids.panel, panel.id, "Duplicate account panel id"); ext.accountPanels.push({ ...panel, roles: panel.roles ?? ALL_ROLES }); },
    page: (page) => { unique(ids.page, page.path, "Duplicate page path"); ext.pages.push({ ...page, roles: page.roles ?? ALL_ROLES }); },
    adminSection: (component) => ext.adminSections.push(component),
    companyRegistry: (provider) => ext.companyRegistries.push(provider),
  };
  manifest.extensions(x);

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    sdk: manifest.sdk,
    description: manifest.description,
    permissions: manifest.permissions,
    settings: manifest.settings ?? z.object({}),
    secrets: manifest.secrets ?? z.object({}),
    extensions: ext,
    onInstall: manifest.onInstall as PluginDefinition["onInstall"],
    onUpgrade: manifest.onUpgrade as PluginDefinition["onUpgrade"],
    onUninstall: manifest.onUninstall as PluginDefinition["onUninstall"],
  };
}
```

- [ ] **Step 10: Write `packages/plugin-sdk/src/index.ts`**

```ts
export * from "./types";
export { SDK_VERSION, parseVersion, compareVersions, satisfiesSdkRange } from "./version";
export { definePlugin, allow, reject, modify } from "./define";
export { z } from "zod";
```

- [ ] **Step 11: Run both tests — expect PASS.** `pnpm exec jest packages/plugin-sdk`
- [ ] **Step 12: Typecheck.** `pnpm exec tsc --noEmit` — expect no errors.
- [ ] **Step 13: Commit**

```bash
git add packages/plugin-sdk tsconfig.json jest.config.ts
git commit -m "feat(plugins): add plugin SDK types, versions and definePlugin"
```

---

### Task 3: Registry generator, boundaries, build wiring

**Files:**
- Create: `scripts/plugins/generate-registry.mjs`, `lib/plugins/plugins.generated.ts`, `lib/plugins/registry.ts`, `plugins/.gitkeep`
- Modify: `package.json`, `Dockerfile`, `eslint.config.mjs`, `.gitignore`
- Test: `lib/plugins/__tests__/registry.test.ts`, `__tests__/plugins/boundaries.test.ts`

**Interfaces:**
- Consumes: `PluginDefinition`, `Locale` from Task 2.
- Produces: `generatedPlugins: GeneratedPluginEntry[]`; `interface RegisteredPlugin { definition: PluginDefinition; source: "public" | "private"; messages: Partial<Record<Locale, Record<string, unknown>>> }`; `getRegistry(): RegisteredPlugin[]`; `findPlugin(id): RegisteredPlugin | undefined`; `buildRegistry(entries): RegisteredPlugin[]` (throws on duplicate ids).

- [ ] **Step 1: Write the failing registry test** `lib/plugins/__tests__/registry.test.ts`

```ts
import { execFileSync } from "node:child_process";
import { definePlugin } from "@nextcrm/plugin-sdk";
import { buildRegistry } from "@/lib/plugins/registry";

const make = (id: string) =>
  definePlugin({ id, name: id, version: "1.0.0", sdk: "^0.1.0", description: "", permissions: [], extensions: () => {} });

describe("plugin registry", () => {
  it("builds a registry and rejects duplicate ids", () => {
    const reg = buildRegistry([{ source: "public", definition: make("a-one"), messages: {} }]);
    expect(reg.map((p) => p.definition.id)).toEqual(["a-one"]);
    expect(() =>
      buildRegistry([
        { source: "public", definition: make("a-one"), messages: {} },
        { source: "private", definition: make("a-one"), messages: {} },
      ]),
    ).toThrow("Duplicate plugin id: a-one");
  });

  it("committed generated file is up to date", () => {
    // exits non-zero and prints a diff hint when stale
    execFileSync("node", ["scripts/plugins/generate-registry.mjs", "--check"], { stdio: "pipe" });
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`Cannot find module '@/lib/plugins/registry'`).

Run: `pnpm exec jest lib/plugins/__tests__/registry.test.ts`

- [ ] **Step 3: Write `scripts/plugins/generate-registry.mjs`**

```js
#!/usr/bin/env node
// Generates lib/plugins/plugins.generated.ts from plugins/* and plugins-private/*.
// Usage: node scripts/plugins/generate-registry.mjs [--check] [--public-only]
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "lib/plugins/plugins.generated.ts");
const LOCALES = ["en", "cz", "de", "uk"];
const check = process.argv.includes("--check");
const publicOnly = check || process.argv.includes("--public-only");
const sources = [["public", "plugins"], ...(publicOnly ? [] : [["private", "plugins-private"]])];

const imports = [];
const entries = [];
for (const [source, dir] of sources) {
  const base = join(ROOT, dir);
  if (!existsSync(base)) continue;
  const ids = readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (existsSync(join(base, d.name, "plugin.ts")) || existsSync(join(base, d.name, "plugin.tsx"))))
    .map((d) => d.name)
    .sort();
  for (const id of ids) {
    const v = `${source}_${id.replace(/-/g, "_")}`;
    imports.push(`import ${v} from "@/${dir}/${id}/plugin";`);
    const msgs = [];
    for (const loc of LOCALES) {
      if (existsSync(join(base, id, "messages", `${loc}.json`))) {
        imports.push(`import ${v}_${loc} from "@/${dir}/${id}/messages/${loc}.json";`);
        msgs.push(`${loc}: ${v}_${loc}`);
      }
    }
    entries.push(`  { source: "${source}", definition: ${v}, messages: { ${msgs.join(", ")} } },`);
  }
}

const content = `// AUTO-GENERATED by scripts/plugins/generate-registry.mjs — do not edit.
import type { GeneratedPluginEntry } from "@/lib/plugins/registry";
${imports.join("\n")}${imports.length ? "\n" : ""}
export const generatedPlugins: GeneratedPluginEntry[] = [
${entries.join("\n")}${entries.length ? "\n" : ""}];
`;

if (check) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== content) {
    console.error("lib/plugins/plugins.generated.ts is stale. Run: pnpm plugins:generate --public-only");
    process.exit(1);
  }
  process.exit(0);
}
writeFileSync(OUT, content);
console.log(`Generated ${entries.length} plugin(s) → lib/plugins/plugins.generated.ts`);
```

- [ ] **Step 4: Write `lib/plugins/registry.ts`**

```ts
import type { Locale, PluginDefinition } from "@nextcrm/plugin-sdk";
import { generatedPlugins } from "./plugins.generated";

export interface GeneratedPluginEntry {
  source: "public" | "private";
  definition: PluginDefinition;
  messages: Partial<Record<Locale, Record<string, unknown>>>;
}

export type RegisteredPlugin = GeneratedPluginEntry;

export function buildRegistry(entries: GeneratedPluginEntry[]): RegisteredPlugin[] {
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.definition.id)) throw new Error(`Duplicate plugin id: ${e.definition.id}`);
    seen.add(e.definition.id);
  }
  return entries;
}

let registry: RegisteredPlugin[] | null = null;

export function getRegistry(): RegisteredPlugin[] {
  if (!registry) registry = buildRegistry(generatedPlugins);
  return registry;
}

export function findPlugin(id: string): RegisteredPlugin | undefined {
  return getRegistry().find((p) => p.definition.id === id);
}
```

- [ ] **Step 5: Generate the (empty) registry and add scripts**

Create empty `plugins/.gitkeep`. In `package.json` `scripts` add:

```json
"plugins:generate": "node scripts/plugins/generate-registry.mjs",
```

Run: `node scripts/plugins/generate-registry.mjs --public-only`
Expected output: `Generated 0 plugin(s) → lib/plugins/plugins.generated.ts`. The file must contain `export const generatedPlugins: GeneratedPluginEntry[] = [\n];`.

- [ ] **Step 6: Run registry test — expect PASS.** `pnpm exec jest lib/plugins/__tests__/registry.test.ts`

- [ ] **Step 7: Write the failing boundary test** `__tests__/plugins/boundaries.test.ts`

```ts
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const IMPORT = /(?:import|export)[^'"]*from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) return [];
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|mjs|js)$/.test(name) ? [p] : [];
  });
}
function importsOf(file: string): string[] {
  const src = readFileSync(file, "utf8");
  return [...src.matchAll(IMPORT)].map((m) => m[1] ?? m[2] ?? m[3]);
}

describe("plugin boundaries", () => {
  it("core does not import plugins (except the generated registry)", () => {
    const offenders: string[] = [];
    for (const dir of ["app", "actions", "lib", "components", "inngest"]) {
      for (const f of files(join(ROOT, dir))) {
        if (relative(ROOT, f) === "lib/plugins/plugins.generated.ts") continue;
        for (const spec of importsOf(f)) {
          if (/^@\/plugins(-private)?\//.test(spec)) offenders.push(`${relative(ROOT, f)} → ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("plugins import only the SDK, their own files, react, zod and npm packages", () => {
    const offenders: string[] = [];
    for (const dir of ["plugins", "plugins-private"]) {
      for (const f of files(join(ROOT, dir))) {
        if (f.includes("__tests__")) continue;
        for (const spec of importsOf(f)) {
          const bad = spec.startsWith("@/") || spec.startsWith("../../") || spec.startsWith("@nextcrm/") && !spec.startsWith("@nextcrm/plugin-sdk");
          if (bad) offenders.push(`${relative(ROOT, f)} → ${spec}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the SDK does not import core", () => {
    const offenders = files(join(ROOT, "packages/plugin-sdk/src")).flatMap((f) =>
      importsOf(f).filter((s) => s.startsWith("@/")).map((s) => `${relative(ROOT, f)} → ${s}`),
    );
    expect(offenders).toEqual([]);
  });
});
```

Note: `../../` from `plugins/<id>/x.ts` would leave the plugin folder; plugins may use `./` and `../` inside their own folder only.

- [ ] **Step 8: Run — expect PASS** (no plugins yet, core clean). `pnpm exec jest __tests__/plugins/boundaries.test.ts`. Then temporarily add `import "@/plugins/x/plugin";` to `lib/plugins/registry.ts`, run again, confirm FAIL listing that file, and revert.

- [ ] **Step 9: ESLint rule for editors** — in `eslint.config.mjs` append to the exported array:

```js
{
  files: ["plugins/**/*.{ts,tsx}", "plugins-private/**/*.{ts,tsx}"],
  rules: {
    "no-restricted-imports": ["error", { patterns: [
      { group: ["@/*"], message: "Plugins may import only @nextcrm/plugin-sdk, their own files and npm packages." },
    ] }],
  },
},
{
  files: ["app/**/*.{ts,tsx}", "actions/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "inngest/**/*.{ts,tsx}"],
  ignores: ["lib/plugins/plugins.generated.ts"],
  rules: {
    "no-restricted-imports": ["error", { patterns: [
      { group: ["@/plugins/*", "@/plugins-private/*"], message: "Core must not import plugins; use lib/plugins/registry." },
    ] }],
  },
},
```

Run: `pnpm exec eslint lib/plugins packages/plugin-sdk` — expect no errors.

- [ ] **Step 10: Docker build regenerates with private plugins.** In `Dockerfile` build stage change `RUN pnpm prisma generate && pnpm next build` to:

```dockerfile
RUN node scripts/plugins/generate-registry.mjs && pnpm prisma generate && pnpm next build
```

In `.gitignore` add nothing for the generated file (it is committed). Add a comment line under the Docker section of `docs/plugins/README.md` in Task 13 explaining submodule checkout.

- [ ] **Step 11: Commit**

```bash
git add scripts/plugins lib/plugins/registry.ts lib/plugins/plugins.generated.ts lib/plugins/__tests__/registry.test.ts __tests__/plugins/boundaries.test.ts plugins/.gitkeep package.json Dockerfile eslint.config.mjs
git commit -m "feat(plugins): registry generator and import boundaries"
```

---

### Task 4: Database models and plugin state

**Files:**
- Modify: `prisma/schema.prisma`, `lib/audit-log.ts`
- Create: `prisma/migrations/20261005000000_add_plugin_tables/migration.sql`, `lib/prisma-base.ts`, `lib/plugins/state.ts`, `lib/plugins/errors.ts`
- Modify: `lib/prisma.ts` (temporarily re-export base; Task 6 adds the extension)
- Test: `lib/plugins/__tests__/state.test.ts`

**Interfaces:**
- Consumes: `getRegistry`, `RegisteredPlugin` (Task 3).
- Produces:
  - `prismaBase` (PrismaClient) from `@/lib/prisma-base` — host modules use this, never `@/lib/prisma`, to avoid an import cycle.
  - `interface PluginStateRow { id: string; version: string; status: "ENABLED" | "DISABLED"; settings: unknown; secrets: string | null; installedAt: Date; installedBy: string | null }`
  - `getPluginStates(): Promise<PluginStateRow[]>` (10 s cache), `invalidatePluginCache(): void`, `getEnabledPlugins(): Promise<RegisteredPlugin[]>`, `getPluginState(id): Promise<PluginStateRow | undefined>`, `listPluginsForAdmin(): Promise<AdminPluginRow[]>` with `AdminPluginRow { id; name; description; version; installedVersion: string | null; status: "NOT_INSTALLED" | "ENABLED" | "DISABLED" | "MISSING"; source: "public" | "private" | null }`.
  - Errors: `class PluginRuleError extends Error { pluginId: string | null; messageKey: string; params?: MessageParams }`, `class PluginPermissionError extends Error`, `class PluginStoreError extends Error`.

- [ ] **Step 1: Prisma models** — append to `prisma/schema.prisma`:

```prisma
enum PluginStatus {
  ENABLED
  DISABLED
}

model InstalledPlugin {
  id          String       @id
  version     String
  status      PluginStatus @default(ENABLED)
  settings    Json         @default("{}")
  secrets     String?
  installedAt DateTime     @default(now())
  installedBy String?      @db.Uuid
  updatedAt   DateTime     @updatedAt
}

model PluginData {
  id         String   @id @default(uuid()) @db.Uuid
  pluginId   String
  entityType String   @default("")
  entityId   String   @default("")
  key        String
  value      Json
  updatedAt  DateTime @updatedAt

  @@unique([pluginId, entityType, entityId, key])
  @@index([pluginId, key])
  @@index([entityType, entityId])
}

model PluginLog {
  id        String   @id @default(uuid()) @db.Uuid
  pluginId  String
  level     String
  message   String
  context   Json?
  createdAt DateTime @default(now())

  @@index([pluginId, createdAt])
}
```

- [ ] **Step 2: Migration SQL** `prisma/migrations/20261005000000_add_plugin_tables/migration.sql`

```sql
CREATE TYPE "PluginStatus" AS ENUM ('ENABLED', 'DISABLED');

CREATE TABLE "InstalledPlugin" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "status" "PluginStatus" NOT NULL DEFAULT 'ENABLED',
  "settings" JSONB NOT NULL DEFAULT '{}',
  "secrets" TEXT,
  "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "installedBy" UUID,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstalledPlugin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PluginData" (
  "id" UUID NOT NULL,
  "pluginId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL DEFAULT '',
  "entityId" TEXT NOT NULL DEFAULT '',
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PluginData_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PluginData_pluginId_entityType_entityId_key_key" ON "PluginData"("pluginId", "entityType", "entityId", "key");
CREATE INDEX "PluginData_pluginId_key_idx" ON "PluginData"("pluginId", "key");
CREATE INDEX "PluginData_entityType_entityId_idx" ON "PluginData"("entityType", "entityId");

CREATE TABLE "PluginLog" (
  "id" UUID NOT NULL,
  "pluginId" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PluginLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PluginLog_pluginId_createdAt_idx" ON "PluginLog"("pluginId", "createdAt");
```

Verify against the schema on a local DB: `pnpm db:up && pnpm db:migrate && pnpm exec prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` — expected output: an empty script (`-- This is an empty migration.`). Then `pnpm exec prisma generate`.

- [ ] **Step 3: Split the Prisma client.** Move the full body of `lib/prisma.ts` into `lib/prisma-base.ts`, renaming the final export to `export const prismaBase = prisma;`. Replace `lib/prisma.ts` with:

```ts
import { prismaBase } from "@/lib/prisma-base";

export const prismadb = prismaBase;
```

Run `pnpm exec tsc --noEmit` — expect no errors.

- [ ] **Step 4: Audit log types** — in `lib/audit-log.ts` extend the unions:

```ts
// AuditEntityType: add
| "plugin"
// AuditAction: add
| "installed" | "uninstalled" | "enabled" | "disabled" | "settings_changed" | "upgraded"
```

- [ ] **Step 5: Write `lib/plugins/errors.ts`**

```ts
import type { MessageParams } from "@nextcrm/plugin-sdk";

export class PluginRuleError extends Error {
  constructor(
    public readonly pluginId: string | null,  // null = core message (Plugins.* namespace)
    public readonly messageKey: string,
    public readonly params?: MessageParams,
    fallbackMessage?: string,
  ) {
    super(fallbackMessage ?? `Rejected by plugin rule ${pluginId ?? "core"}:${messageKey}`);
    this.name = "PluginRuleError";
  }
}

export class PluginPermissionError extends Error {
  constructor(pluginId: string, permission: string) {
    super(`Plugin ${pluginId} lacks permission ${permission}`);
    this.name = "PluginPermissionError";
  }
}

export class PluginStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PluginStoreError";
  }
}
```

- [ ] **Step 6: Write the failing state test** `lib/plugins/__tests__/state.test.ts`

```ts
import { definePlugin } from "@nextcrm/plugin-sdk";

const findMany = jest.fn();
jest.mock("@/lib/prisma-base", () => ({ prismaBase: { installedPlugin: { findMany: (...a: unknown[]) => findMany(...a) } } }));
jest.mock("@/lib/plugins/registry", () => {
  const mk = (id: string) => ({ source: "public", messages: {}, definition: definePlugin({ id, name: id.toUpperCase(), version: "1.0.0", sdk: "^0.1.0", description: "d", permissions: [], extensions: () => {} }) });
  const reg = [mk("alpha"), mk("beta"), mk("gamma")];
  return { getRegistry: () => reg, findPlugin: (id: string) => reg.find((p) => p.definition.id === id) };
});

import { getEnabledPlugins, getPluginStates, invalidatePluginCache, listPluginsForAdmin } from "@/lib/plugins/state";

const row = (id: string, status: "ENABLED" | "DISABLED", version = "1.0.0") =>
  ({ id, version, status, settings: {}, secrets: null, installedAt: new Date(), installedBy: null });

beforeEach(() => { findMany.mockReset(); invalidatePluginCache(); jest.useRealTimers(); });

it("returns only enabled plugins that exist in the registry", async () => {
  findMany.mockResolvedValue([row("alpha", "ENABLED"), row("beta", "DISABLED"), row("ghost", "ENABLED")]);
  const enabled = await getEnabledPlugins();
  expect(enabled.map((p) => p.definition.id)).toEqual(["alpha"]);
});

it("caches state for 10 seconds", async () => {
  jest.useFakeTimers();
  findMany.mockResolvedValue([row("alpha", "ENABLED")]);
  await getPluginStates();
  await getPluginStates();
  expect(findMany).toHaveBeenCalledTimes(1);
  jest.advanceTimersByTime(10_001);
  await getPluginStates();
  expect(findMany).toHaveBeenCalledTimes(2);
});

it("lists available, installed and missing plugins for admin", async () => {
  findMany.mockResolvedValue([row("alpha", "ENABLED"), row("beta", "DISABLED", "0.9.0"), row("ghost", "ENABLED", "2.0.0")]);
  const rows = await listPluginsForAdmin();
  expect(rows).toEqual([
    expect.objectContaining({ id: "alpha", status: "ENABLED", installedVersion: "1.0.0" }),
    expect.objectContaining({ id: "beta", status: "DISABLED", installedVersion: "0.9.0", version: "1.0.0" }),
    expect.objectContaining({ id: "gamma", status: "NOT_INSTALLED", installedVersion: null }),
    expect.objectContaining({ id: "ghost", status: "MISSING", name: "ghost", source: null }),
  ]);
});
```

- [ ] **Step 7: Run — expect FAIL** (`Cannot find module '@/lib/plugins/state'`).

- [ ] **Step 8: Write `lib/plugins/state.ts`**

```ts
import { prismaBase } from "@/lib/prisma-base";
import { getRegistry, type RegisteredPlugin } from "./registry";

export interface PluginStateRow {
  id: string;
  version: string;
  status: "ENABLED" | "DISABLED";
  settings: unknown;
  secrets: string | null;
  installedAt: Date;
  installedBy: string | null;
}

export interface AdminPluginRow {
  id: string;
  name: string;
  description: string;
  version: string | null;            // version in the image, null when missing
  installedVersion: string | null;
  status: "NOT_INSTALLED" | "ENABLED" | "DISABLED" | "MISSING";
  source: "public" | "private" | null;
}

const TTL_MS = 10_000;
let cache: { at: number; rows: PluginStateRow[] } | null = null;

export function invalidatePluginCache(): void {
  cache = null;
}

export async function getPluginStates(): Promise<PluginStateRow[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = (await prismaBase.installedPlugin.findMany()) as PluginStateRow[];
  cache = { at: Date.now(), rows };
  return rows;
}

export async function getPluginState(id: string): Promise<PluginStateRow | undefined> {
  return (await getPluginStates()).find((r) => r.id === id);
}

export async function getEnabledPlugins(): Promise<RegisteredPlugin[]> {
  const enabled = new Set((await getPluginStates()).filter((r) => r.status === "ENABLED").map((r) => r.id));
  return getRegistry().filter((p) => enabled.has(p.definition.id));
}

export async function listPluginsForAdmin(): Promise<AdminPluginRow[]> {
  const states = new Map((await getPluginStates()).map((r) => [r.id, r]));
  const rows: AdminPluginRow[] = getRegistry().map((p) => {
    const s = states.get(p.definition.id);
    return {
      id: p.definition.id,
      name: p.definition.name,
      description: p.definition.description,
      version: p.definition.version,
      installedVersion: s?.version ?? null,
      status: s ? s.status : "NOT_INSTALLED",
      source: p.source,
    };
  });
  const known = new Set(rows.map((r) => r.id));
  for (const s of states.values()) {
    if (!known.has(s.id)) {
      rows.push({ id: s.id, name: s.id, description: "", version: null, installedVersion: s.version, status: "MISSING", source: null });
    }
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}
```

- [ ] **Step 9: Run — expect PASS.** `pnpm exec jest lib/plugins/__tests__/state.test.ts`
- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261005000000_add_plugin_tables lib/prisma-base.ts lib/prisma.ts lib/audit-log.ts lib/plugins/errors.ts lib/plugins/state.ts lib/plugins/__tests__/state.test.ts
git commit -m "feat(plugins): plugin tables and cached plugin state"
```

---

### Task 5: Settings, i18n and the plugin context

**Files:**
- Create: `lib/plugins/settings.ts`, `lib/plugins/i18n.ts`, `lib/plugins/actor.ts`, `lib/plugins/store.ts`, `lib/plugins/log.ts`, `lib/plugins/http.ts`, `lib/plugins/notify.ts`, `lib/plugins/data-api.ts`, `lib/plugins/context.ts`
- Modify: `i18n/request.ts`, `locales/{en,cz,de,uk}.json`
- Test: `lib/plugins/__tests__/settings.test.ts`, `lib/plugins/__tests__/i18n.test.ts`, `lib/plugins/__tests__/context.test.ts`

**Interfaces:**
- Consumes: Task 2 types; `prismaBase`; `getPluginState`; `findPlugin`; `PluginPermissionError`, `PluginStoreError`; `encrypt`/`decrypt` from `@/lib/email-crypto`; `assertPublicHost` from `@/lib/net/host-guard`; `resendHelper` default export from `@/lib/resend`.
- Produces:
  - `type SettingsField = { key: string; kind: "string" | "number" | "boolean" | "enum"; required: boolean; defaultValue?: unknown; options?: string[] }`; `describeSettingsSchema(schema): SettingsField[]` (throws `Unsupported settings field type: <type> (<key>)`); `parseStoredSettings(schema, stored, onWarn): Record<string, unknown>`; `encryptSecrets(obj): string | null`; `decryptSecrets(cipher): Record<string, unknown>`.
  - `mergePluginMessages(base, locale)`, `translatePluginMessage(pluginId | null, key, params, locale): string`.
  - `actorStorage`, `runAsActor(actor, fn)`, `currentActorFrame(): ActorFrame | undefined` where `ActorFrame { actor: Actor; depth: number }`, `resolveActor(): Promise<Actor>`.
  - `createPluginContext({ plugin: RegisteredPlugin, actor: Actor, locale?: Locale }): Promise<PluginContext>`.
  - `writePluginLog(pluginId, level, message, context?)`.

- [ ] **Step 1: Write the failing settings test** `lib/plugins/__tests__/settings.test.ts`

```ts
import { z } from "zod";
jest.mock("@/lib/email-crypto", () => ({ encrypt: (s: string) => `enc:${s}`, decrypt: (s: string) => s.replace(/^enc:/, "") }));
import { decryptSecrets, describeSettingsSchema, encryptSecrets, parseStoredSettings } from "@/lib/plugins/settings";

const schema = z.object({
  days: z.number().int().min(1).default(90),
  mode: z.enum(["direct", "intermediary"]).default("direct"),
  url: z.string(),
  note: z.string().optional(),
  autoConfirm: z.boolean().default(false),
});

it("describes flat schemas for form generation", () => {
  expect(describeSettingsSchema(schema)).toEqual([
    { key: "days", kind: "number", required: false, defaultValue: 90 },
    { key: "mode", kind: "enum", required: false, defaultValue: "direct", options: ["direct", "intermediary"] },
    { key: "url", kind: "string", required: true },
    { key: "note", kind: "string", required: false },
    { key: "autoConfirm", kind: "boolean", required: false, defaultValue: false },
  ]);
});

it("refuses nested or unsupported field types", () => {
  expect(() => describeSettingsSchema(z.object({ list: z.array(z.string()) }))).toThrow("Unsupported settings field type: array (list)");
});

it("falls back to defaults per invalid field and warns (Review Focus 1)", () => {
  const warn = jest.fn();
  const parsed = parseStoredSettings(schema, { days: "ninety", mode: "direct", url: "https://x", legacy: 1 }, warn);
  expect(parsed).toEqual({ days: 90, mode: "direct", url: "https://x", autoConfirm: false });
  expect(warn).toHaveBeenCalledWith("Stored settings invalid; using defaults for: days", expect.anything());
});

it("keeps a required field without default as undefined instead of crashing", () => {
  const parsed = parseStoredSettings(schema, {}, jest.fn());
  expect(parsed.url).toBeUndefined();
  expect(parsed.days).toBe(90);
});

it("encrypts and decrypts secrets as JSON", () => {
  const c = encryptSecrets({ apiKey: "k" });
  expect(c).toBe('enc:{"apiKey":"k"}');
  expect(decryptSecrets(c)).toEqual({ apiKey: "k" });
  expect(encryptSecrets({})).toBeNull();
  expect(decryptSecrets(null)).toEqual({});
});
```

- [ ] **Step 2: Run — expect FAIL.** `pnpm exec jest lib/plugins/__tests__/settings.test.ts`

- [ ] **Step 3: Write `lib/plugins/settings.ts`** (zod 4: `schema._zod.def.type`, wrappers `optional`/`default` with `innerType`, enum `entries`)

```ts
import type { z } from "zod";
import { decrypt, encrypt } from "@/lib/email-crypto";

export interface SettingsField {
  key: string;
  kind: "string" | "number" | "boolean" | "enum";
  required: boolean;
  defaultValue?: unknown;
  options?: string[];
}

type Def = { type: string; innerType?: any; defaultValue?: unknown; entries?: Record<string, string> };
const def = (s: any): Def => s._zod.def;

export function describeSettingsSchema(schema: z.ZodObject<any>): SettingsField[] {
  return Object.entries(schema.shape).map(([key, raw]) => {
    let s: any = raw;
    let required = true;
    let defaultValue: unknown;
    let hasDefault = false;
    while (def(s).type === "optional" || def(s).type === "default") {
      if (def(s).type === "default") { defaultValue = def(s).defaultValue; hasDefault = true; }
      required = false;
      s = def(s).innerType;
    }
    const t = def(s).type;
    const field: SettingsField = { key, kind: "string", required };
    if (t === "string" || t === "number" || t === "boolean") field.kind = t;
    else if (t === "enum") { field.kind = "enum"; field.options = Object.values(def(s).entries ?? {}); }
    else throw new Error(`Unsupported settings field type: ${t} (${key})`);
    if (hasDefault) field.defaultValue = defaultValue;
    return field;
  });
}

export function parseStoredSettings(
  schema: z.ZodObject<any>,
  stored: unknown,
  onWarn: (message: string, context: Record<string, unknown>) => void,
): Record<string, unknown> {
  const input = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const invalid: string[] = [];
  for (const [key, fieldSchema] of Object.entries(schema.shape) as [string, z.ZodType][]) {
    const res = fieldSchema.safeParse(input[key]);
    if (res.success) { out[key] = res.data; continue; }
    const fallback = fieldSchema.safeParse(undefined);
    if (fallback.success) out[key] = fallback.data;
    if (input[key] !== undefined) invalid.push(key);
  }
  if (invalid.length) onWarn(`Stored settings invalid; using defaults for: ${invalid.join(", ")}`, { fields: invalid });
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
}

export function encryptSecrets(values: Record<string, unknown>): string | null {
  return Object.keys(values).length ? encrypt(JSON.stringify(values)) : null;
}

export function decryptSecrets(cipher: string | null): Record<string, unknown> {
  return cipher ? (JSON.parse(decrypt(cipher)) as Record<string, unknown>) : {};
}
```

Note on the "required field without default" test: `out.url` stays absent, so `parsed.url` is `undefined` — plugins must treat required settings as possibly missing until the admin saves them (documented in Task 13).

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Write the failing i18n test** `lib/plugins/__tests__/i18n.test.ts`

```ts
jest.mock("@/lib/plugins/registry", () => ({
  getRegistry: () => [{ definition: { id: "demo" }, messages: { en: { err: { taken: "Taken until {date}" } }, cz: { err: { taken: "Chráněno do {date}" } } } }],
}));
import { mergePluginMessages, translatePluginMessage } from "@/lib/plugins/i18n";

it("merges plugin messages under plugins.<id> with en fallback", () => {
  const merged = mergePluginMessages({ Common: { ok: "OK" } }, "de");
  expect(merged).toEqual({ Common: { ok: "OK" }, plugins: { demo: { err: { taken: "Taken until {date}" } } } });
});

it("translates plugin and core keys", () => {
  expect(translatePluginMessage("demo", "err.taken", { date: "1. 1." }, "cz")).toBe("Chráněno do 1. 1.");
  expect(translatePluginMessage(null, "ruleUnavailable", undefined, "en")).toBe("A plugin rule is unavailable. The change was not saved.");
  expect(translatePluginMessage("demo", "missing.key", undefined, "en")).toBe("demo:missing.key");
});
```

- [ ] **Step 6: Add core messages.** In each of `locales/en.json`, `cz.json`, `de.json`, `uk.json` add a top-level `"Plugins"` object (keys used by Tasks 5, 10, 11, 12):

`en.json`:
```json
"Plugins": {
  "ruleUnavailable": "A plugin rule is unavailable. The change was not saved.",
  "sectionUnavailable": "This plugin section is unavailable.",
  "loadFromRegistry": "Load from registry",
  "registryNotFound": "Company not found in the registry.",
  "admin": { "title": "Plugins", "notInstalled": "Not installed", "enabled": "Enabled", "disabled": "Disabled", "missing": "Missing from this version", "install": "Install", "enable": "Enable", "disable": "Disable", "uninstall": "Uninstall", "save": "Save settings", "saved": "Settings saved", "permissions": "Requested permissions", "confirmPermissions": "I grant these permissions", "settings": "Settings", "secrets": "Secrets", "secretSet": "Set (leave empty to keep)", "log": "Log", "export": "Download data (JSON)", "uninstallTitle": "Uninstall {name}?", "uninstallBody": "{entries} stored values on {records} records and the plugin log will be deleted. Data the plugin wrote into CRM records stays.", "confirmUninstall": "Uninstall and delete plugin data", "upgradePending": "Upgrade pending: {from} → {to}" }
}
```

`cz.json`:
```json
"Plugins": {
  "ruleUnavailable": "Pravidlo pluginu není dostupné. Změna nebyla uložena.",
  "sectionUnavailable": "Tato část pluginu není dostupná.",
  "loadFromRegistry": "Načíst z registru",
  "registryNotFound": "Firma v registru nenalezena.",
  "admin": { "title": "Pluginy", "notInstalled": "Nenainstalováno", "enabled": "Zapnuto", "disabled": "Vypnuto", "missing": "V této verzi chybí", "install": "Instalovat", "enable": "Zapnout", "disable": "Vypnout", "uninstall": "Odinstalovat", "save": "Uložit nastavení", "saved": "Nastavení uloženo", "permissions": "Požadovaná oprávnění", "confirmPermissions": "Uděluji tato oprávnění", "settings": "Nastavení", "secrets": "Tajné hodnoty", "secretSet": "Nastaveno (prázdné = ponechat)", "log": "Log", "export": "Stáhnout data (JSON)", "uninstallTitle": "Odinstalovat {name}?", "uninstallBody": "Smaže se {entries} uložených hodnot u {records} záznamů a log pluginu. Data, která plugin zapsal do záznamů CRM, zůstanou.", "confirmUninstall": "Odinstalovat a smazat data pluginu", "upgradePending": "Čeká aktualizace: {from} → {to}" }
}
```

`de.json`:
```json
"Plugins": {
  "ruleUnavailable": "Eine Plugin-Regel ist nicht verfügbar. Die Änderung wurde nicht gespeichert.",
  "sectionUnavailable": "Dieser Plugin-Bereich ist nicht verfügbar.",
  "loadFromRegistry": "Aus Register laden",
  "registryNotFound": "Firma im Register nicht gefunden.",
  "admin": { "title": "Plugins", "notInstalled": "Nicht installiert", "enabled": "Aktiviert", "disabled": "Deaktiviert", "missing": "Fehlt in dieser Version", "install": "Installieren", "enable": "Aktivieren", "disable": "Deaktivieren", "uninstall": "Deinstallieren", "save": "Einstellungen speichern", "saved": "Einstellungen gespeichert", "permissions": "Angeforderte Berechtigungen", "confirmPermissions": "Ich erteile diese Berechtigungen", "settings": "Einstellungen", "secrets": "Geheimnisse", "secretSet": "Gesetzt (leer lassen zum Beibehalten)", "log": "Protokoll", "export": "Daten herunterladen (JSON)", "uninstallTitle": "{name} deinstallieren?", "uninstallBody": "{entries} gespeicherte Werte zu {records} Datensätzen und das Plugin-Protokoll werden gelöscht. Daten, die das Plugin in CRM-Datensätze geschrieben hat, bleiben erhalten.", "confirmUninstall": "Deinstallieren und Plugin-Daten löschen", "upgradePending": "Update ausstehend: {from} → {to}" }
}
```

`uk.json`:
```json
"Plugins": {
  "ruleUnavailable": "Правило плагіна недоступне. Зміну не збережено.",
  "sectionUnavailable": "Цей розділ плагіна недоступний.",
  "loadFromRegistry": "Завантажити з реєстру",
  "registryNotFound": "Компанію в реєстрі не знайдено.",
  "admin": { "title": "Плагіни", "notInstalled": "Не встановлено", "enabled": "Увімкнено", "disabled": "Вимкнено", "missing": "Відсутній у цій версії", "install": "Встановити", "enable": "Увімкнути", "disable": "Вимкнути", "uninstall": "Видалити", "save": "Зберегти налаштування", "saved": "Налаштування збережено", "permissions": "Запитані дозволи", "confirmPermissions": "Надаю ці дозволи", "settings": "Налаштування", "secrets": "Секрети", "secretSet": "Задано (залиште порожнім, щоб зберегти)", "log": "Журнал", "export": "Завантажити дані (JSON)", "uninstallTitle": "Видалити {name}?", "uninstallBody": "Буде видалено {entries} збережених значень для {records} записів і журнал плагіна. Дані, які плагін записав у записи CRM, залишаться.", "confirmUninstall": "Видалити та стерти дані плагіна", "upgradePending": "Очікує оновлення: {from} → {to}" }
}
```

- [ ] **Step 7: Write `lib/plugins/i18n.ts`**

```ts
import { createTranslator } from "next-intl";
import type { Locale, MessageParams } from "@nextcrm/plugin-sdk";
import { getRegistry } from "./registry";
import en from "@/locales/en.json";
import cz from "@/locales/cz.json";
import de from "@/locales/de.json";
import uk from "@/locales/uk.json";

const CORE = { en, cz, de, uk } as Record<Locale, Record<string, unknown>>;

export function mergePluginMessages<T extends Record<string, unknown>>(base: T, locale: Locale): T & { plugins: Record<string, unknown> } {
  const plugins: Record<string, unknown> = {};
  for (const p of getRegistry()) {
    const msgs = p.messages[locale] ?? p.messages.en;
    if (msgs) plugins[p.definition.id] = msgs;
  }
  return { ...base, plugins };
}

export function translatePluginMessage(pluginId: string | null, key: string, params: MessageParams | undefined, locale: Locale): string {
  const messages = mergePluginMessages(CORE[locale] ?? CORE.en, locale);
  const namespace = pluginId ? `plugins.${pluginId}` : "Plugins";
  try {
    const t = createTranslator({ locale, messages, namespace: namespace as never });
    return t(key as never, params as never);
  } catch {
    return `${pluginId ?? "core"}:${key}`;
  }
}
```

If `createTranslator` returns the key path instead of throwing for a missing key in this next-intl version, add `onError: () => { throw new Error("missing"); }` and `getMessageFallback: () => { throw new Error("missing"); }` to its options so the fallback branch runs; the test pins the behaviour.

- [ ] **Step 8: Merge in the request config.** In `i18n/request.ts` replace the `messages:` line with:

```ts
messages: mergePluginMessages((await import(`../locales/${locale}.json`)).default, locale as Locale),
```

and add imports `import { mergePluginMessages } from "@/lib/plugins/i18n";` and `import type { Locale } from "@nextcrm/plugin-sdk";`.

- [ ] **Step 9: Run i18n test — expect PASS.** `pnpm exec jest lib/plugins/__tests__/i18n.test.ts`

- [ ] **Step 10: Write `lib/plugins/actor.ts`**

```ts
import { AsyncLocalStorage } from "node:async_hooks";
import type { Actor } from "@nextcrm/plugin-sdk";

export interface ActorFrame { actor: Actor; depth: number }

export const actorStorage = new AsyncLocalStorage<ActorFrame>();

export function currentActorFrame(): ActorFrame | undefined {
  return actorStorage.getStore();
}

export function runAsActor<T>(actor: Actor, fn: () => T): T {
  const parent = actorStorage.getStore();
  const depth = actor.type === "plugin" ? (parent?.depth ?? 0) + 1 : parent?.depth ?? 0;
  return actorStorage.run({ actor, depth }, fn);
}

/** Actor for the current write: explicit frame, else the session user, else system. */
export async function resolveActor(): Promise<Actor> {
  const frame = actorStorage.getStore();
  if (frame) return frame.actor;
  try {
    const { requireAuthenticated } = await import("@/lib/authz");
    const user = await requireAuthenticated();
    return { type: "user", userId: user.id, role: user.role };
  } catch {
    return { type: "system" };
  }
}
```

- [ ] **Step 11: Write `lib/plugins/log.ts`, `store.ts`, `http.ts`, `notify.ts`**

`lib/plugins/log.ts`:
```ts
import type { PluginLogger, RecordData } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";

export type LogLevel = "debug" | "info" | "warn" | "error";

export function writePluginLog(pluginId: string, level: LogLevel, message: string, context?: RecordData): void {
  void prismaBase.pluginLog
    .create({ data: { pluginId, level, message: message.slice(0, 2000), context: (context ?? undefined) as never } })
    .catch((e: unknown) => console.error("[PLUGIN_LOG]", pluginId, e));
}

export function createLogger(pluginId: string): PluginLogger {
  return {
    debug: (m, c) => writePluginLog(pluginId, "debug", m, c),
    info: (m, c) => writePluginLog(pluginId, "info", m, c),
    warn: (m, c) => writePluginLog(pluginId, "warn", m, c),
    error: (m, c) => writePluginLog(pluginId, "error", m, c),
  };
}
```

`lib/plugins/store.ts`:
```ts
import type { Entity, PluginStore, RecordStore } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import { PluginStoreError } from "./errors";

const MAX_BYTES = 256 * 1024;

function scoped(pluginId: string, entityType: string, entityId: string): RecordStore {
  const where = (key: string) => ({ pluginId_entityType_entityId_key: { pluginId, entityType, entityId, key } });
  return {
    async get<T>(key: string) {
      const row = await prismaBase.pluginData.findUnique({ where: where(key) });
      return (row?.value ?? null) as T | null;
    },
    async set(key, value) {
      const json = JSON.stringify(value);
      if (json === undefined) throw new PluginStoreError("Store value must be JSON-serialisable");
      if (Buffer.byteLength(json, "utf8") > MAX_BYTES) throw new PluginStoreError(`Store value for ${key} exceeds 256 KB`);
      await prismaBase.pluginData.upsert({
        where: where(key),
        create: { pluginId, entityType, entityId, key, value: value as never },
        update: { value: value as never },
      });
    },
    async delete(key) {
      await prismaBase.pluginData.deleteMany({ where: { pluginId, entityType, entityId, key } });
    },
    async list(prefix = "") {
      const rows = await prismaBase.pluginData.findMany({
        where: { pluginId, entityType, entityId, key: { startsWith: prefix } },
        orderBy: { key: "asc" },
      });
      return rows.map((r) => ({ key: r.key, value: r.value }));
    },
  };
}

export function createStore(pluginId: string): PluginStore {
  return { ...scoped(pluginId, "", ""), forRecord: (entity: Entity, id: string) => scoped(pluginId, entity, id) };
}
```

`lib/plugins/http.ts`:
```ts
import type { PluginHttp, PluginLogger } from "@nextcrm/plugin-sdk";
import { assertPublicHost } from "@/lib/net/host-guard";

export function createHttp(log: PluginLogger): PluginHttp {
  return {
    async fetch(url, init = {}) {
      const { timeoutMs = 15_000, ...rest } = init;
      const u = new URL(url);
      if (process.env.PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS !== "true") await assertPublicHost(u.hostname);
      const started = Date.now();
      try {
        const res = await fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
        log.debug("http", { url: `${u.origin}${u.pathname}`, status: res.status, ms: Date.now() - started });
        return res;
      } catch (e) {
        log.warn("http failed", { url: `${u.origin}${u.pathname}`, ms: Date.now() - started, error: String(e) });
        throw e;
      }
    },
  };
}
```

(`assertPublicHost` resolves and checks the host; the fetch then re-resolves. The DNS-rebinding window is accepted because plugins are trusted code — documented in Task 13.)

`lib/plugins/notify.ts`:
```ts
import type { NotifyInput } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import { parseRole } from "@/lib/authz/roles";
import resendHelper from "@/lib/resend";

export async function sendPluginNotification(pluginId: string, input: NotifyInput): Promise<void> {
  const users = await prismaBase.users.findMany({ select: { id: true, email: true, role: true } as never });
  const roles = new Set(input.roles ?? []);
  const ids = new Set(input.userIds ?? []);
  const to = (users as { id: string; email: string | null; role: string | null }[])
    .filter((u) => u.email && (ids.has(u.id) || roles.has(parseRole(u.role))))
    .map((u) => u.email as string);
  if (!to.length) return;
  const resend = await resendHelper();
  await resend.emails.send({
    from: `${process.env.NEXT_PUBLIC_APP_NAME} <${process.env.EMAIL_FROM}>`,
    to,
    subject: input.subject,
    text: input.text,
  });
}
```

Before writing `notify.ts`, open `lib/authz/roles.ts` and confirm `parseRole(value)` returns an `AppRole`; open `prisma/schema.prisma` `model Users` and confirm the role column name (the exploration found `Users.role`); adjust the `select` if it differs. Remove the `as never` casts once types check.

- [ ] **Step 12: Write `lib/plugins/data-api.ts`**

```ts
import type { DataApi, EntityApi, FindArgs, Permission, ReadApi, RecordData } from "@nextcrm/plugin-sdk";
import { PluginPermissionError } from "./errors";
import { runAsActor } from "./actor";

type Delegate = {
  findUnique(a: unknown): Promise<unknown>;
  findMany(a: unknown): Promise<unknown[]>;
  create(a: unknown): Promise<unknown>;
  update(a: unknown): Promise<unknown>;
};

// Lazy import: lib/prisma imports the rules extension, which builds contexts that import this file.
async function db(): Promise<Record<string, Delegate>> {
  const { prismadb } = await import("@/lib/prisma");
  return prismadb as unknown as Record<string, Delegate>;
}

const SAVED_EVENT: Record<string, string> = {
  crm_Accounts: "crm/account.saved",
  crm_Contacts: "crm/contact.saved",
  crm_Leads: "crm/lead.saved",
  crm_Opportunities: "crm/opportunity.saved",
};

export function createDataApi(pluginId: string, permissions: Permission[]): DataApi {
  const need = (p: Permission) => {
    if (!permissions.includes(p)) throw new PluginPermissionError(pluginId, p);
  };
  const read = (model: string, perm: Permission): ReadApi => ({
    async get(id) { need(perm); return (await (await db())[model].findUnique({ where: { id } })) as RecordData | null; },
    async find(args: FindArgs = {}) { need(perm); return (await (await db())[model].findMany({ take: 100, ...args })) as RecordData[]; },
  });
  const entity = (model: string, r: Permission, w: Permission): EntityApi => ({
    ...read(model, r),
    async create(data) {
      need(w);
      const row = (await runAsActor({ type: "plugin", pluginId }, async () => (await db())[model].create({ data: { v: 0, ...data } }))) as RecordData;
      await emitSaved(model, row.id as string);
      return row;
    },
    async update(id, data) {
      need(w);
      const row = (await runAsActor({ type: "plugin", pluginId }, async () => (await db())[model].update({ where: { id }, data }))) as RecordData;
      await emitSaved(model, id);
      return row;
    },
  });
  return {
    accounts: entity("crm_Accounts", "accounts:read", "accounts:write"),
    contacts: entity("crm_Contacts", "contacts:read", "contacts:write"),
    leads: entity("crm_Leads", "leads:read", "leads:write"),
    opportunities: entity("crm_Opportunities", "opportunities:read", "opportunities:write"),
    activities: { find: read("crm_Activities", "activities:read").find },
    users: read("users", "users:read"),
    products: read("crm_Products", "products:read"),
  };
}

async function emitSaved(model: string, recordId: string) {
  const { inngest } = await import("@/inngest/client");
  void inngest.send({ name: SAVED_EVENT[model], data: { record_id: recordId } });
}
```

Before writing, confirm the Prisma delegate names for activities, users and products in `prisma/schema.prisma` (`crm_Activities`, `Users` → delegate `users`, `crm_Products`) and that every CRM model has a required `v Int` field (the exploration showed `crm_Accounts.v`); if a model lacks `v`, drop `v: 0` for it via a per-model default map.

- [ ] **Step 13: Write `lib/plugins/context.ts`**

```ts
import type { Actor, Locale, PluginContext } from "@nextcrm/plugin-sdk";
import type { RegisteredPlugin } from "./registry";
import { getPluginState } from "./state";
import { decryptSecrets, parseStoredSettings } from "./settings";
import { createLogger } from "./log";
import { createStore } from "./store";
import { createHttp } from "./http";
import { createDataApi } from "./data-api";
import { sendPluginNotification } from "./notify";
import { translatePluginMessage } from "./i18n";
import { PluginPermissionError } from "./errors";

export async function createPluginContext(args: { plugin: RegisteredPlugin; actor: Actor; locale?: Locale }): Promise<PluginContext> {
  const { definition } = args.plugin;
  const locale = args.locale ?? "en";
  const log = createLogger(definition.id);
  const state = await getPluginState(definition.id);
  const settings = parseStoredSettings(definition.settings, state?.settings, (m, c) => log.warn(m, c));
  const rawSecrets = decryptSecrets(state?.secrets ?? null);
  const secrets = parseStoredSettings(definition.secrets, rawSecrets, (m, c) => log.warn(m, c));
  const has = (p: string) => definition.permissions.includes(p as never);
  const http = createHttp(log);
  return {
    plugin: { id: definition.id, version: definition.version },
    actor: args.actor,
    locale,
    settings,
    secrets,
    data: createDataApi(definition.id, definition.permissions),
    store: createStore(definition.id),
    http: {
      fetch: (url, init) => {
        if (!has("http")) throw new PluginPermissionError(definition.id, "http");
        return http.fetch(url, init);
      },
    },
    notify: async (input) => {
      if (!has("notify")) throw new PluginPermissionError(definition.id, "notify");
      await sendPluginNotification(definition.id, input);
    },
    log,
    t: (key, params) => translatePluginMessage(definition.id, key, params, locale),
  };
}
```

- [ ] **Step 14: Write the context test** `lib/plugins/__tests__/context.test.ts`

```ts
import { definePlugin, z } from "@nextcrm/plugin-sdk";

const pluginData = new Map<string, unknown>();
jest.mock("@/lib/prisma-base", () => ({
  prismaBase: {
    pluginLog: { create: jest.fn().mockResolvedValue({}) },
    pluginData: {
      findUnique: jest.fn(async ({ where }: any) => {
        const k = JSON.stringify(where.pluginId_entityType_entityId_key);
        return pluginData.has(k) ? { value: pluginData.get(k) } : null;
      }),
      upsert: jest.fn(async ({ where, create }: any) => { pluginData.set(JSON.stringify(where.pluginId_entityType_entityId_key), create.value); }),
      deleteMany: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));
jest.mock("@/lib/plugins/state", () => ({ getPluginState: jest.fn(async () => ({ id: "demo", settings: { days: "x" }, secrets: null })) }));
jest.mock("@/lib/email-crypto", () => ({ encrypt: (s: string) => s, decrypt: (s: string) => s }));
jest.mock("@/lib/net/host-guard", () => ({ assertPublicHost: jest.fn() }));
jest.mock("@/lib/resend", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("@/lib/plugins/i18n", () => ({ translatePluginMessage: (_p: string, k: string) => k }));

import { createPluginContext } from "@/lib/plugins/context";
import { PluginPermissionError } from "@/lib/plugins/errors";

const plugin = {
  source: "public" as const, messages: {},
  definition: definePlugin({
    id: "demo", name: "Demo", version: "1.0.0", sdk: "^0.1.0", description: "", permissions: ["accounts:read"],
    settings: z.object({ days: z.number().default(90) }), extensions: () => {},
  }),
};

it("parses settings with fallback and scopes the store per record", async () => {
  const ctx = await createPluginContext({ plugin, actor: { type: "system" } });
  expect(ctx.settings).toEqual({ days: 90 });
  await ctx.store.forRecord("account", "a1").set("until", "2027-01-01");
  expect(await ctx.store.forRecord("account", "a1").get("until")).toBe("2027-01-01");
  expect(await ctx.store.forRecord("account", "a2").get("until")).toBeNull();
  expect(await ctx.store.get("until")).toBeNull();
});

it("enforces permissions", async () => {
  const ctx = await createPluginContext({ plugin, actor: { type: "system" } });
  await expect(ctx.data.accounts.update("a1", { name: "x" })).rejects.toBeInstanceOf(PluginPermissionError);
  expect(() => ctx.http.fetch("https://example.com")).toThrow(PluginPermissionError);
  await expect(ctx.notify({ roles: ["manager"], subject: "s", text: "t" })).rejects.toBeInstanceOf(PluginPermissionError);
});

it("rejects oversized store values", async () => {
  const ctx = await createPluginContext({ plugin, actor: { type: "system" } });
  await expect(ctx.store.set("big", "x".repeat(256 * 1024 + 1))).rejects.toThrow("exceeds 256 KB");
});
```

- [ ] **Step 15: Run all Task 5 tests — expect PASS.** `pnpm exec jest lib/plugins/__tests__/settings.test.ts lib/plugins/__tests__/i18n.test.ts lib/plugins/__tests__/context.test.ts`. Then `pnpm exec tsc --noEmit`.
- [ ] **Step 16: Commit**

```bash
git add lib/plugins i18n/request.ts locales
git commit -m "feat(plugins): settings, i18n, actor context and plugin ctx"
```

---

### Task 6: Rules on write (Prisma extension)

**Files:**
- Create: `lib/plugins/rules.ts`, `lib/plugins/prisma-extension.ts`
- Modify: `lib/prisma.ts`
- Test: `lib/plugins/__tests__/rules.test.ts`, `lib/plugins/__tests__/prisma-extension.test.ts`

**Interfaces:**
- Consumes: `getEnabledPlugins`, `createPluginContext`, `resolveActor`, `currentActorFrame`, `runAsActor`, `PluginRuleError`, `writePluginLog`.
- Produces:
  - `MODEL_TO_ENTITY: Record<string, Entity>`.
  - `runBeforeRules(input: RuleInput, deps?: RuleDeps): Promise<RecordData>` — returns the (possibly patched) data or throws `PluginRuleError`; `RuleDeps { getEnabledPlugins; createPluginContext; resolveActor; timeoutMs }`.
  - `afterTargets(entity, operation): Promise<string[]>` — ids of enabled plugins with after-hooks.
  - `withPluginRules(base: PrismaClient)` — returns the extended client; `lib/prisma.ts` exports it as `prismadb`.

- [ ] **Step 1: Write the failing rules test** `lib/plugins/__tests__/rules.test.ts`

```ts
import { allow, definePlugin, modify, reject } from "@nextcrm/plugin-sdk";
import type { RuleInput } from "@nextcrm/plugin-sdk";
import { runBeforeRules } from "@/lib/plugins/rules";
import { PluginRuleError } from "@/lib/plugins/errors";
import { runAsActor } from "@/lib/plugins/actor";

jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));
jest.mock("@/lib/plugins/i18n", () => ({ translatePluginMessage: (p: string | null, k: string) => `${p ?? "core"}:${k}` }));

const reg = (id: string, build: Parameters<typeof definePlugin>[0]["extensions"]) => ({
  source: "public" as const, messages: {},
  definition: definePlugin({ id, name: id, version: "1.0.0", sdk: "^0.1.0", description: "", permissions: [], extensions: build }),
});

const input: RuleInput = { entity: "account", operation: "beforeCreate", recordId: null, data: { name: "Acme" }, existing: null };
const deps = (plugins: ReturnType<typeof reg>[]) => ({
  getEnabledPlugins: async () => plugins,
  createPluginContext: async () => ({}) as any,
  resolveActor: async () => ({ type: "system" as const }),
  timeoutMs: 50,
});

it("applies modify patches in priority order", async () => {
  const p1 = reg("p-one", (x) => x.rule("account", "beforeCreate", () => modify({ name: "B" }), { priority: 200 }));
  const p2 = reg("p-two", (x) => x.rule("account", "beforeCreate", (i) => modify({ name: `${i.data.name}-A` }), { priority: 10 }));
  await expect(runBeforeRules(input, deps([p1, p2]))).resolves.toEqual({ name: "B" });
});

it("stops at the first reject", async () => {
  const later = jest.fn(() => allow());
  const p1 = reg("p-one", (x) => x.rule("account", "beforeCreate", () => reject("err.taken", { date: "1. 1." })));
  const p2 = reg("p-two", (x) => x.rule("account", "beforeCreate", later, { priority: 500 }));
  const err = await runBeforeRules(input, deps([p1, p2])).catch((e) => e);
  expect(err).toBeInstanceOf(PluginRuleError);
  expect(err).toMatchObject({ pluginId: "p-one", messageKey: "err.taken", params: { date: "1. 1." } });
  expect(later).not.toHaveBeenCalled();
});

it("onError allow lets the write through; block rejects within the timeout (Review Focus 5)", async () => {
  const hang = () => new Promise<never>(() => {});
  const allowing = reg("p-allow", (x) => x.rule("account", "beforeCreate", hang));
  await expect(runBeforeRules(input, deps([allowing]))).resolves.toEqual({ name: "Acme" });
  const blocking = reg("p-block", (x) => x.rule("account", "beforeCreate", () => { throw new Error("boom"); }, { onError: "block" }));
  const started = Date.now();
  const err = await runBeforeRules(input, deps([blocking])).catch((e) => e);
  expect(err).toMatchObject({ pluginId: null, messageKey: "ruleUnavailable" });
  const hanging = reg("p-hang", (x) => x.rule("account", "beforeCreate", hang, { onError: "block" }));
  await expect(runBeforeRules(input, deps([hanging]))).rejects.toMatchObject({ messageKey: "ruleUnavailable" });
  expect(Date.now() - started).toBeLessThan(500);
});

it("skips the writing plugin's own rules and caps depth (Review Focus 3)", async () => {
  const own = jest.fn(() => reject("own"));
  const other = jest.fn(() => allow());
  const pA = reg("p-a", (x) => x.rule("account", "beforeCreate", own));
  const pB = reg("p-b", (x) => x.rule("account", "beforeCreate", other));
  const d = { ...deps([pA, pB]), resolveActor: async () => ({ type: "plugin" as const, pluginId: "p-a" }) };
  await runAsActor({ type: "plugin", pluginId: "p-a" }, () => runBeforeRules(input, d));
  expect(own).not.toHaveBeenCalled();
  expect(other).toHaveBeenCalled();
  const deep = () =>
    runAsActor({ type: "plugin", pluginId: "p-a" }, () =>
      runAsActor({ type: "plugin", pluginId: "p-b" }, () =>
        runAsActor({ type: "plugin", pluginId: "p-a" }, () =>
          runAsActor({ type: "plugin", pluginId: "p-b" }, () => runBeforeRules(input, d)))));
  await expect(deep()).rejects.toThrow("Plugin write depth exceeded (max 3)");
});

it("ignores rules for other entities and operations", async () => {
  const fn = jest.fn(() => reject("x"));
  const p = reg("p-one", (x) => { x.rule("lead", "beforeCreate", fn); x.rule("account", "beforeUpdate", fn); });
  await expect(runBeforeRules(input, deps([p]))).resolves.toEqual({ name: "Acme" });
  expect(fn).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run — expect FAIL.** `pnpm exec jest lib/plugins/__tests__/rules.test.ts`

- [ ] **Step 3: Write `lib/plugins/rules.ts`**

```ts
import type { AfterOperation, Entity, RecordData, RuleInput, RuleRegistration } from "@nextcrm/plugin-sdk";
import type { RegisteredPlugin } from "./registry";
import { currentActorFrame } from "./actor";
import { PluginRuleError } from "./errors";
import { writePluginLog } from "./log";

export const MODEL_TO_ENTITY: Record<string, Entity> = {
  crm_Accounts: "account",
  crm_Contacts: "contact",
  crm_Leads: "lead",
  crm_Opportunities: "opportunity",
};

const MAX_DEPTH = 3;

export interface RuleDeps {
  getEnabledPlugins: () => Promise<RegisteredPlugin[]>;
  createPluginContext: (args: { plugin: RegisteredPlugin; actor: any }) => Promise<any>;
  resolveActor: () => Promise<any>;
  timeoutMs: number;
}

const defaultDeps = async (): Promise<RuleDeps> => ({
  getEnabledPlugins: (await import("./state")).getEnabledPlugins,
  createPluginContext: (await import("./context")).createPluginContext,
  resolveActor: (await import("./actor")).resolveActor,
  timeoutMs: 500,
});

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Rule timed out after ${ms} ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export async function hasRules(entity: Entity, deps?: RuleDeps): Promise<boolean> {
  const d = deps ?? (await defaultDeps());
  return (await d.getEnabledPlugins()).some((p) => p.definition.extensions.rules.some((r) => r.entity === entity));
}

export async function runBeforeRules(input: RuleInput, deps?: RuleDeps): Promise<RecordData> {
  const d = deps ?? (await defaultDeps());
  const frame = currentActorFrame();
  if ((frame?.depth ?? 0) > MAX_DEPTH) throw new Error(`Plugin write depth exceeded (max ${MAX_DEPTH})`);
  const writer = frame?.actor.type === "plugin" ? frame.actor.pluginId : null;

  const matches: { plugin: RegisteredPlugin; rule: RuleRegistration }[] = [];
  for (const plugin of await d.getEnabledPlugins()) {
    if (plugin.definition.id === writer) continue;
    for (const rule of plugin.definition.extensions.rules) {
      if (rule.entity === input.entity && rule.operation === input.operation) matches.push({ plugin, rule });
    }
  }
  if (!matches.length) return input.data;
  matches.sort((a, b) => a.rule.priority - b.rule.priority || a.plugin.definition.id.localeCompare(b.plugin.definition.id));

  const actor = await d.resolveActor();
  let data = { ...input.data };
  for (const { plugin, rule } of matches) {
    const id = plugin.definition.id;
    let result;
    try {
      const ctx = await d.createPluginContext({ plugin, actor });
      result = await withTimeout(Promise.resolve(rule.handler({ ...input, data }, ctx)), d.timeoutMs);
    } catch (e) {
      writePluginLog(id, "error", `Rule ${input.entity}.${input.operation} failed: ${String(e)}`);
      if (rule.onError === "block") throw new PluginRuleError(null, "ruleUnavailable");
      continue;
    }
    if (result.kind === "reject") throw new PluginRuleError(id, result.messageKey, result.params);
    if (result.kind === "modify") data = { ...data, ...result.patch };
  }
  return data;
}

export async function afterTargets(entity: Entity, operation: AfterOperation, deps?: RuleDeps): Promise<string[]> {
  const d = deps ?? (await defaultDeps());
  return (await d.getEnabledPlugins())
    .filter((p) => p.definition.extensions.afters.some((a) => a.entity === entity && a.operation === operation))
    .map((p) => p.definition.id);
}
```

Note the depth check: the test nests four plugin frames (depth 4) and expects a throw; three nested frames are allowed.

- [ ] **Step 4: Run — expect PASS.**

- [ ] **Step 5: Write the failing extension test** `lib/plugins/__tests__/prisma-extension.test.ts`

The extension logic is split into a pure function `interceptWrite(params, deps)` so it can be tested without a database.

```ts
import { interceptWrite } from "@/lib/plugins/prisma-extension";
import { PluginRuleError } from "@/lib/plugins/errors";

const mkDeps = (over: Partial<Parameters<typeof interceptWrite>[1]> = {}) => ({
  hasRules: jest.fn(async () => true),
  runBeforeRules: jest.fn(async (i: any) => i.data),
  afterTargets: jest.fn(async () => [] as string[]),
  sendAfter: jest.fn(),
  findExisting: jest.fn(async () => ({ id: "a1", name: "Old", deletedAt: null })),
  findManyExisting: jest.fn(async () => [{ id: "a1" }, { id: "a2" }]),
  deleteRecordData: jest.fn(),
  ...over,
});

it("passes through unwatched models and reads", async () => {
  const deps = mkDeps();
  const query = jest.fn(async () => "ok");
  await interceptWrite({ model: "Users", operation: "update", args: { where: { id: "u" }, data: {} }, query }, deps);
  await interceptWrite({ model: "crm_Accounts", operation: "findMany", args: {}, query }, deps);
  expect(deps.runBeforeRules).not.toHaveBeenCalled();
  expect(query).toHaveBeenCalledTimes(2);
});

it("fast path: no enabled rules or afters → no lookups", async () => {
  const deps = mkDeps({ hasRules: jest.fn(async () => false) });
  await interceptWrite({ model: "crm_Accounts", operation: "update", args: { where: { id: "a1" }, data: { name: "N" } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.findExisting).not.toHaveBeenCalled();
});

it("runs beforeCreate with patched data and emits after", async () => {
  const deps = mkDeps({
    runBeforeRules: jest.fn(async (i: any) => ({ ...i.data, name: "Patched" })),
    afterTargets: jest.fn(async () => ["p-one"]),
  });
  const query = jest.fn(async (a: any) => ({ id: "new", ...a.data }));
  const res = await interceptWrite({ model: "crm_Accounts", operation: "create", args: { data: { name: "X" } }, query }, deps);
  expect(query).toHaveBeenCalledWith({ data: { name: "Patched" } });
  expect(res).toMatchObject({ id: "new", name: "Patched" });
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", { entity: "account", operation: "created", recordId: "new" });
});

it("treats setting deletedAt as beforeDelete / deleted", async () => {
  const deps = mkDeps({ afterTargets: jest.fn(async () => ["p-one"]) });
  await interceptWrite({ model: "crm_Accounts", operation: "update", args: { where: { id: "a1" }, data: { deletedAt: new Date() } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.runBeforeRules).toHaveBeenCalledWith(expect.objectContaining({ operation: "beforeDelete", recordId: "a1" }));
  expect(deps.sendAfter).toHaveBeenCalledWith("p-one", expect.objectContaining({ operation: "deleted" }));
});

it("does not write when a rule rejects", async () => {
  const deps = mkDeps({ runBeforeRules: jest.fn(async () => { throw new PluginRuleError("p", "no"); }) });
  const query = jest.fn();
  await expect(interceptWrite({ model: "crm_Leads", operation: "create", args: { data: {} }, query }, deps)).rejects.toBeInstanceOf(PluginRuleError);
  expect(query).not.toHaveBeenCalled();
});

it("runs rules per row for updateMany and refuses modify on bulk", async () => {
  const deps = mkDeps({ runBeforeRules: jest.fn(async (i: any) => i.data) });
  await interceptWrite({ model: "crm_Contacts", operation: "updateMany", args: { where: { x: 1 }, data: { a: 1 } }, query: async () => ({ count: 2 }) }, deps);
  expect(deps.runBeforeRules).toHaveBeenCalledTimes(2);
  const modifying = mkDeps({ runBeforeRules: jest.fn(async () => ({ a: 2 })) });
  await expect(
    interceptWrite({ model: "crm_Contacts", operation: "updateMany", args: { where: {}, data: { a: 1 } }, query: async () => ({ count: 2 }) }, modifying),
  ).rejects.toThrow("Plugin rules cannot modify bulk writes");
});

it("deletes plugin data on hard delete", async () => {
  const deps = mkDeps();
  await interceptWrite({ model: "crm_Accounts", operation: "delete", args: { where: { id: "a1" } }, query: async () => ({ id: "a1" }) }, deps);
  expect(deps.deleteRecordData).toHaveBeenCalledWith("account", ["a1"]);
});
```

- [ ] **Step 6: Run — expect FAIL.**

- [ ] **Step 7: Write `lib/plugins/prisma-extension.ts`**

```ts
import { Prisma, type PrismaClient } from "@prisma/client";
import type { AfterOperation, BeforeOperation, Entity, RecordData } from "@nextcrm/plugin-sdk";
import { MODEL_TO_ENTITY } from "./rules";

const WRITE_OPS = new Set(["create", "createMany", "update", "updateMany", "upsert", "delete", "deleteMany"]);

export interface InterceptDeps {
  hasRules(entity: Entity): Promise<boolean>;
  runBeforeRules(input: { entity: Entity; operation: BeforeOperation; recordId: string | null; data: RecordData; existing: RecordData | null }): Promise<RecordData>;
  afterTargets(entity: Entity, operation: AfterOperation): Promise<string[]>;
  sendAfter(pluginId: string, data: { entity: Entity; operation: AfterOperation; recordId: string }): void;
  findExisting(model: string, where: unknown): Promise<RecordData | null>;
  findManyExisting(model: string, where: unknown): Promise<RecordData[]>;
  deleteRecordData(entity: Entity, ids: string[]): void;
}

interface Params { model?: string; operation: string; args: any; query: (args: any) => Promise<any> }

const isSoftDelete = (data: RecordData | undefined, existing: RecordData | null) =>
  !!data && data.deletedAt != null && existing?.deletedAt == null;

export async function interceptWrite(p: Params, deps: InterceptDeps): Promise<any> {
  const entity = p.model ? MODEL_TO_ENTITY[p.model] : undefined;
  if (!entity || !WRITE_OPS.has(p.operation)) return p.query(p.args);
  const anyAfter = async () =>
    (await deps.afterTargets(entity, "created")).length + (await deps.afterTargets(entity, "updated")).length + (await deps.afterTargets(entity, "deleted")).length > 0;
  if (!(await deps.hasRules(entity)) && !(await anyAfter())) return p.query(p.args);

  const model = p.model as string;
  const emit = async (operation: AfterOperation, ids: string[]) => {
    for (const pluginId of await deps.afterTargets(entity, operation)) {
      for (const recordId of ids) deps.sendAfter(pluginId, { entity, operation, recordId });
    }
  };

  switch (p.operation) {
    case "create": {
      const data = await deps.runBeforeRules({ entity, operation: "beforeCreate", recordId: null, data: p.args.data, existing: null });
      const row = await p.query({ ...p.args, data });
      await emit("created", [row.id]);
      return row;
    }
    case "createMany": {
      const items: RecordData[] = Array.isArray(p.args.data) ? p.args.data : [p.args.data];
      for (const item of items) {
        const out = await deps.runBeforeRules({ entity, operation: "beforeCreate", recordId: null, data: item, existing: null });
        if (JSON.stringify(out) !== JSON.stringify(item)) throw new Error("Plugin rules cannot modify bulk writes");
      }
      return p.query(p.args);   // createMany returns only a count; after-actions are not emitted for bulk creates
    }
    case "update":
    case "upsert": {
      const existing = await deps.findExisting(model, p.args.where);
      if (p.operation === "upsert" && !existing) {
        const data = await deps.runBeforeRules({ entity, operation: "beforeCreate", recordId: null, data: p.args.create, existing: null });
        const row = await p.query({ ...p.args, create: data });
        await emit("created", [row.id]);
        return row;
      }
      const input = p.operation === "upsert" ? p.args.update : p.args.data;
      const soft = isSoftDelete(input, existing);
      const operation: BeforeOperation = soft ? "beforeDelete" : "beforeUpdate";
      const data = await deps.runBeforeRules({ entity, operation, recordId: (existing?.id as string) ?? null, data: input, existing });
      const row = await p.query(p.operation === "upsert" ? { ...p.args, update: data } : { ...p.args, data });
      await emit(soft ? "deleted" : "updated", [row.id]);
      return row;
    }
    case "updateMany":
    case "deleteMany": {
      const rows = await deps.findManyExisting(model, p.args.where);
      const ids = rows.map((r) => r.id as string);
      for (const existing of rows) {
        const input = p.operation === "updateMany" ? p.args.data : {};
        const soft = p.operation === "updateMany" && isSoftDelete(input, existing);
        const operation: BeforeOperation = p.operation === "deleteMany" || soft ? "beforeDelete" : "beforeUpdate";
        const out = await deps.runBeforeRules({ entity, operation, recordId: existing.id as string, data: input, existing });
        if (JSON.stringify(out) !== JSON.stringify(input)) throw new Error("Plugin rules cannot modify bulk writes");
      }
      const res = await p.query(p.args);
      if (p.operation === "deleteMany") { deps.deleteRecordData(entity, ids); await emit("deleted", ids); }
      else await emit(isSoftDelete(p.args.data, null) ? "deleted" : "updated", ids);
      return res;
    }
    case "delete": {
      const existing = await deps.findExisting(model, p.args.where);
      await deps.runBeforeRules({ entity, operation: "beforeDelete", recordId: (existing?.id as string) ?? null, data: {}, existing });
      const row = await p.query(p.args);
      deps.deleteRecordData(entity, [row.id]);
      await emit("deleted", [row.id]);
      return row;
    }
  }
  return p.query(p.args);
}

export function withPluginRules(base: PrismaClient) {
  const deps: InterceptDeps = {
    hasRules: async (entity) => (await import("./rules")).hasRules(entity),
    runBeforeRules: async (input) => (await import("./rules")).runBeforeRules(input),
    afterTargets: async (entity, op) => (await import("./rules")).afterTargets(entity, op),
    sendAfter: (pluginId, data) => {
      void import("@/inngest/client").then(({ inngest }) => inngest.send({ name: `plugin/${pluginId}/after`, data }));
    },
    findExisting: (model, where) => (base as any)[model].findUnique({ where }),
    findManyExisting: (model, where) => (base as any)[model].findMany({ where }),
    deleteRecordData: (entity, ids) => {
      void base.pluginData.deleteMany({ where: { entityType: entity, entityId: { in: ids } } }).catch((e) => console.error("[PLUGIN_DATA_CLEANUP]", e));
    },
  };
  return base.$extends(
    Prisma.defineExtension({
      name: "plugin-rules",
      query: {
        $allModels: {
          $allOperations: ({ model, operation, args, query }) => interceptWrite({ model, operation, args, query }, deps),
        },
      },
    }),
  );
}
```

`findExisting` uses the base client on purpose: lookups must not re-enter the extension.

- [ ] **Step 8: Run — expect PASS.** `pnpm exec jest lib/plugins/__tests__/prisma-extension.test.ts lib/plugins/__tests__/rules.test.ts`

- [ ] **Step 9: Wire the extension.** Replace `lib/prisma.ts` with:

```ts
import { prismaBase } from "@/lib/prisma-base";
import { withPluginRules } from "@/lib/plugins/prisma-extension";

export const prismadb = withPluginRules(prismaBase);
export type DbClient = typeof prismadb;
```

- [ ] **Step 10: Fix types.** Run `pnpm exec tsc --noEmit`. The extended client's type differs from `PrismaClient`. For each error where a function parameter is typed `PrismaClient` and receives `prismadb`, change the parameter type to `DbClient` (import `type DbClient` from `@/lib/prisma`); where it receives a transaction client, use `Prisma.TransactionClient`. Do not cast to `any`. Repeat until `tsc` is clean.

- [ ] **Step 11: Run the whole suite** — `pnpm exec jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"` — expect the same pass count as on `main` (existing tests mock `@/lib/prisma`, so they are unaffected).

- [ ] **Step 12: Commit**

```bash
git add lib/plugins/rules.ts lib/plugins/prisma-extension.ts lib/plugins/__tests__/rules.test.ts lib/plugins/__tests__/prisma-extension.test.ts lib/prisma.ts
git commit -m "feat(plugins): enforce plugin rules on CRM writes via Prisma extension"
```

(also `git add` every file changed in Step 10.)

---

### Task 7: Surface rule rejections in actions and MCP; actor for MCP; account.deleted event

**Files:**
- Create: `lib/plugins/action-errors.ts`
- Modify: `actions/crm/accounts/{create-account,update-account,delete-account}.ts`, `actions/crm/contacts/{create-contact,update-contact,delete-contact}.ts`, `actions/crm/leads/{create-lead,update-lead,delete-lead}.ts`, `actions/crm/opportunities/{create-opportunity,update-opportunity,delete-opportunity}.ts`, `app/api/mcp/[transport]/route.ts`
- Test: `lib/plugins/__tests__/action-errors.test.ts`, `actions/crm/accounts/__tests__/plugin-rule-error.test.ts`

**Interfaces:**
- Consumes: `PluginRuleError`, `translatePluginMessage`, `runAsActor`.
- Produces: `pluginRuleErrorMessage(error: unknown): Promise<string | null>`.

- [ ] **Step 1: Write the failing helper test** `lib/plugins/__tests__/action-errors.test.ts`

```ts
jest.mock("next-intl/server", () => ({ getLocale: jest.fn(async () => "cz") }));
jest.mock("@/lib/plugins/i18n", () => ({ translatePluginMessage: (p: string | null, k: string, _x: unknown, l: string) => `${l}|${p}|${k}` }));
import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";
import { PluginRuleError } from "@/lib/plugins/errors";

it("translates plugin rule errors in the request locale", async () => {
  expect(await pluginRuleErrorMessage(new PluginRuleError("demo", "err.taken"))).toBe("cz|demo|err.taken");
  expect(await pluginRuleErrorMessage(new Error("other"))).toBeNull();
});
```

- [ ] **Step 2: Run — FAIL. Step 3: implement `lib/plugins/action-errors.ts`**

```ts
import type { Locale } from "@nextcrm/plugin-sdk";
import { PluginRuleError } from "./errors";
import { translatePluginMessage } from "./i18n";

export async function pluginRuleErrorMessage(error: unknown): Promise<string | null> {
  if (!(error instanceof PluginRuleError)) return null;
  let locale: Locale = "en";
  try {
    const { getLocale } = await import("next-intl/server");
    locale = (await getLocale()) as Locale;
  } catch { /* outside a request: keep en */ }
  return translatePluginMessage(error.pluginId, error.messageKey, error.params, locale);
}
```

Run — PASS.

- [ ] **Step 4: Write the failing action test** `actions/crm/accounts/__tests__/plugin-rule-error.test.ts` (mocks mirror `accounts-write-scope.test.ts`)

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(async () => ({ id: "u1", role: "user" })),
  assertCanWriteAccount: jest.fn(),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("@/lib/auth-server", () => ({ getSession: jest.fn() }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn(), diffObjects: jest.fn(() => null) }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/plugins/action-errors", () => ({
  pluginRuleErrorMessage: jest.fn(async (e: any) => (e?.name === "PluginRuleError" ? "Firma je chráněná do 1. 1. 2027" : null)),
}));
jest.mock("@/lib/prisma", () => ({
  prismadb: {
    crm_Accounts: {
      create: jest.fn(async () => { const e = new Error("rule"); e.name = "PluginRuleError"; throw e; }),
      findUnique: jest.fn().mockResolvedValue({ id: "acc-1" }),
      update: jest.fn(async () => { const e = new Error("rule"); e.name = "PluginRuleError"; throw e; }),
    },
  },
}));
import { createAccount } from "@/actions/crm/accounts/create-account";

it("returns the translated rule message instead of the generic error", async () => {
  await expect(createAccount({ name: "Acme" } as any)).resolves.toEqual({ error: "Firma je chráněná do 1. 1. 2027" });
});
```

- [ ] **Step 5: Run — FAIL** (returns `{ error: "Failed to create account" }`).

- [ ] **Step 6: Patch the twelve actions.** In each file listed above, inside the `catch (error)` block of the write, add as the first lines:

```ts
const ruleMessage = await pluginRuleErrorMessage(error);
if (ruleMessage) return { error: ruleMessage };
```

and the import `import { pluginRuleErrorMessage } from "@/lib/plugins/action-errors";`. If an action's catch variable has another name, use it. If an action has no try/catch around the write, wrap the write in one that returns the action's existing error shape. Check each action's return shape (`{ error }` vs `{ ok: false, error }`) and match it.

In `actions/crm/accounts/delete-account.ts`, after the successful soft delete and audit log, add:

```ts
void inngest.send({ name: "crm/account.deleted", data: { record_id: accountId } });
```

(use the action's actual id variable; import `inngest` from `@/inngest/client` if not already imported).

- [ ] **Step 7: Run — PASS.** `pnpm exec jest actions/crm` (all existing action tests must still pass).

- [ ] **Step 8: MCP route.** In `app/api/mcp/[transport]/route.ts`:
  - wrap the handler call: `const result = await runAsActor({ type: "token", userId: mcpUser.id, role: mcpUser.role }, () => (tool.handler as any)(args as any, mcpUser.id, mcpUser));`
  - at the start of the `catch (err: any)` block add:

```ts
if (err instanceof PluginRuleError) {
  const message = translatePluginMessage(err.pluginId, err.messageKey, err.params, "en");
  return { content: [{ type: "text" as const, text: JSON.stringify({ error: message, code: "RULE_REJECTED" }) }], isError: true };
}
```

  - imports: `runAsActor` from `@/lib/plugins/actor`, `PluginRuleError` from `@/lib/plugins/errors`, `translatePluginMessage` from `@/lib/plugins/i18n`.

Add a test `lib/mcp/__tests__/plugin-rule-error.test.ts` only if `lib/mcp/__tests__/` already contains a route-level test to copy the harness from; otherwise cover it in the Task 14 end-to-end check.

- [ ] **Step 9: Typecheck + commit**

```bash
pnpm exec tsc --noEmit
git add lib/plugins/action-errors.ts lib/plugins/__tests__/action-errors.test.ts actions/crm app/api/mcp
git commit -m "feat(plugins): show plugin rule rejections in actions and MCP"
```

---

### Task 8: Inngest wiring — crons, events, after-actions, install job, log retention

**Files:**
- Create: `lib/plugins/inngest.ts`
- Modify: `app/api/inngest/route.ts`
- Test: `lib/plugins/__tests__/inngest.test.ts`

**Interfaces:**
- Consumes: `getRegistry`, `getPluginState`, `createPluginContext`, `runAsActor`, `prismaBase`, `inngest` client, `invalidatePluginCache`, `writePluginLog`.
- Produces: `runIfEnabled(plugin: RegisteredPlugin, fn: (ctx) => unknown): Promise<{ status: "ok" | "skipped:disabled" }>`; `buildPluginFunctions(registry)`; `pluginInstallFunction` (event `plugin/installed`, data `{ pluginId }`); `pluginLogRetention` (cron `30 3 * * *`); `getPluginFunctions()` = all of the above for the route.

- [ ] **Step 1: Write the failing test** `lib/plugins/__tests__/inngest.test.ts`

```ts
import { definePlugin } from "@nextcrm/plugin-sdk";

const created: any[] = [];
jest.mock("@/inngest/client", () => ({
  inngest: { createFunction: jest.fn((cfg: any, handler: any) => { created.push({ cfg, handler }); return { cfg, handler }; }) },
}));
const state = jest.fn();
jest.mock("@/lib/plugins/state", () => ({ getPluginState: (...a: unknown[]) => state(...a), invalidatePluginCache: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({ log: { error: jest.fn() } })) }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));
jest.mock("@/lib/prisma-base", () => ({ prismaBase: { pluginLog: { deleteMany: jest.fn() }, installedPlugin: { update: jest.fn() } } }));

import { buildPluginFunctions } from "@/lib/plugins/inngest";

const cron = jest.fn();
const onSaved = jest.fn();
const after = jest.fn();
const plugin = {
  source: "public" as const, messages: {},
  definition: definePlugin({
    id: "demo", name: "Demo", version: "1.0.0", sdk: "^0.1.0", description: "", permissions: [],
    extensions: (x) => {
      x.cron("nightly", "0 3 * * *", cron);
      x.on("crm/account.saved", onSaved);
      x.after("account", "created", after);
    },
  }),
};

beforeEach(() => { created.length = 0; jest.clearAllMocks(); });

it("registers one function per cron and event plus one after-dispatcher", () => {
  buildPluginFunctions([plugin]);
  expect(created.map((c) => c.cfg.id)).toEqual(["plugin-demo-cron-nightly", "plugin-demo-on-crm-account-saved", "plugin-demo-after"]);
  expect(created[0].cfg.triggers).toEqual([{ cron: "0 3 * * *" }]);
  expect(created[2].cfg.triggers).toEqual([{ event: "plugin/demo/after" }]);
  expect(created.every((c) => c.cfg.retries === 3)).toBe(true);
});

it("skips handlers while the plugin is disabled or not installed", async () => {
  buildPluginFunctions([plugin]);
  state.mockResolvedValue({ status: "DISABLED" });
  await expect(created[0].handler({ event: { data: {} } })).resolves.toEqual({ status: "skipped:disabled" });
  state.mockResolvedValue(undefined);
  await expect(created[1].handler({ event: { data: { record_id: "a" } } })).resolves.toEqual({ status: "skipped:disabled" });
  expect(cron).not.toHaveBeenCalled();
  expect(onSaved).not.toHaveBeenCalled();
});

it("dispatches after-actions by entity and operation", async () => {
  buildPluginFunctions([plugin]);
  state.mockResolvedValue({ status: "ENABLED" });
  await created[2].handler({ event: { data: { entity: "account", operation: "created", recordId: "a1" } } });
  await created[2].handler({ event: { data: { entity: "account", operation: "updated", recordId: "a1" } } });
  expect(after).toHaveBeenCalledTimes(1);
  expect(after).toHaveBeenCalledWith({ entity: "account", operation: "created", recordId: "a1" }, expect.anything());
});
```

- [ ] **Step 2: Run — FAIL. Step 3: write `lib/plugins/inngest.ts`**

```ts
import { inngest } from "@/inngest/client";
import { prismaBase } from "@/lib/prisma-base";
import type { PluginContext } from "@nextcrm/plugin-sdk";
import { getRegistry, findPlugin, type RegisteredPlugin } from "./registry";
import { getPluginState, invalidatePluginCache } from "./state";
import { createPluginContext } from "./context";
import { runAsActor } from "./actor";
import { writePluginLog } from "./log";

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

export async function runIfEnabled(plugin: RegisteredPlugin, fn: (ctx: PluginContext) => Promise<unknown> | unknown) {
  const state = await getPluginState(plugin.definition.id);
  if (state?.status !== "ENABLED") return { status: "skipped:disabled" as const };
  const actor = { type: "plugin" as const, pluginId: plugin.definition.id };
  const ctx = await createPluginContext({ plugin, actor });
  try {
    await runAsActor(actor, () => fn(ctx));
  } catch (e) {
    ctx.log.error(`Job failed: ${String(e)}`);
    throw e;   // Inngest retries
  }
  return { status: "ok" as const };
}

export function buildPluginFunctions(registry: RegisteredPlugin[]) {
  const fns: unknown[] = [];
  for (const plugin of registry) {
    const { id, extensions } = plugin.definition;
    for (const cron of extensions.crons) {
      fns.push(inngest.createFunction(
        { id: `plugin-${id}-cron-${slug(cron.id)}`, name: `Plugin ${id}: ${cron.id}`, retries: 3, triggers: [{ cron: cron.schedule }] },
        async () => runIfEnabled(plugin, (ctx) => cron.handler(ctx)),
      ));
    }
    for (const ev of extensions.events) {
      fns.push(inngest.createFunction(
        { id: `plugin-${id}-on-${slug(ev.event)}`, name: `Plugin ${id}: on ${ev.event}`, retries: 3, triggers: [{ event: ev.event }] },
        async ({ event }: { event: { data: Record<string, unknown> } }) => runIfEnabled(plugin, (ctx) => ev.handler(event.data, ctx)),
      ));
    }
    if (extensions.afters.length) {
      fns.push(inngest.createFunction(
        { id: `plugin-${id}-after`, name: `Plugin ${id}: after write`, retries: 3, triggers: [{ event: `plugin/${id}/after` }] },
        async ({ event }: { event: { data: { entity: string; operation: string; recordId: string } } }) =>
          runIfEnabled(plugin, async (ctx) => {
            for (const a of extensions.afters) {
              if (a.entity === event.data.entity && a.operation === event.data.operation) {
                await a.handler(event.data as never, ctx);
              }
            }
          }),
      ));
    }
  }
  return fns;
}

export const pluginInstallFunction = inngest.createFunction(
  { id: "plugin-lifecycle-install", name: "Plugin install", retries: 0, triggers: [{ event: "plugin/installed" }] },
  async ({ event }: { event: { data: { pluginId: string } } }) => {
    const plugin = findPlugin(event.data.pluginId);
    if (!plugin?.definition.onInstall) return { status: "ok" };
    try {
      const actor = { type: "plugin" as const, pluginId: plugin.definition.id };
      const ctx = await createPluginContext({ plugin, actor });
      await runAsActor(actor, () => plugin.definition.onInstall!(ctx));
      return { status: "ok" };
    } catch (e) {
      writePluginLog(plugin.definition.id, "error", `onInstall failed: ${String(e)}`);
      await prismaBase.installedPlugin.update({ where: { id: plugin.definition.id }, data: { status: "DISABLED" } });
      invalidatePluginCache();
      return { status: "failed" };
    }
  },
);

export const pluginLogRetention = inngest.createFunction(
  { id: "plugin-log-retention", name: "Plugin log retention", triggers: [{ cron: "30 3 * * *" }] },
  async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { count } = await prismaBase.pluginLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return { deleted: count };
  },
);

export function getPluginFunctions() {
  return [...buildPluginFunctions(getRegistry()), pluginInstallFunction, pluginLogRetention];
}
```

Note: the jest mock for `@/inngest/client` must be in place before `pluginInstallFunction` is created at import time — it is (mocks hoist).

- [ ] **Step 4: Run — PASS. Step 5: register in `app/api/inngest/route.ts`**: add `import { getPluginFunctions } from "@/lib/plugins/inngest";` and change `functions: [ ... ]` to `functions: [ ...existing entries..., ...getPluginFunctions() ]`.
- [ ] **Step 6: Typecheck. Step 7: Commit**

```bash
git add lib/plugins/inngest.ts lib/plugins/__tests__/inngest.test.ts app/api/inngest/route.ts
git commit -m "feat(plugins): register plugin crons, events and after-actions with Inngest"
```

---

### Task 9: Lifecycle service and upgrades on start

**Files:**
- Create: `lib/plugins/lifecycle.ts`, `lib/plugins/upgrade.ts`, `instrumentation.ts`
- Test: `lib/plugins/__tests__/lifecycle.test.ts`, `lib/plugins/__tests__/upgrade.test.ts`

**Interfaces:**
- Consumes: registry, state, settings, context, actor, `writeAuditLog`, `inngest`, `compareVersions`, `satisfiesSdkRange`.
- Produces:
  - `installPlugin(id, userId, input: { settings: Record<string, unknown>; secrets: Record<string, unknown> }): Promise<void>` — throws `Error("Plugin not found")`, `Error("Plugin already installed")`, `Error("Incompatible SDK: requires <range>, running <SDK_VERSION>")`, zod errors for invalid settings.
  - `setPluginEnabled(id, userId, enabled: boolean): Promise<void>`
  - `savePluginSettings(id, userId, input: { settings; secrets }): Promise<void>` — empty-string secret = keep existing.
  - `getUninstallSummary(id): Promise<{ entries: number; records: number; logLines: number }>`
  - `exportPluginData(id): Promise<{ pluginId; exportedAt; settings; data: { entityType; entityId; key; value }[] }>`
  - `uninstallPlugin(id, userId): Promise<void>` — calls `onUninstall` only when code is present.
  - `runPluginUpgrades(): Promise<void>`.

- [ ] **Step 1: Write the failing lifecycle test** `lib/plugins/__tests__/lifecycle.test.ts`

```ts
import { definePlugin, z } from "@nextcrm/plugin-sdk";

const db = {
  installedPlugin: { create: jest.fn(), update: jest.fn(), delete: jest.fn(), findUnique: jest.fn() },
  pluginData: { deleteMany: jest.fn(), count: jest.fn(async () => 5), findMany: jest.fn(async () => [{ entityType: "account", entityId: "a1", key: "k", value: 1 }]), groupBy: jest.fn(async () => [{ entityType: "account", entityId: "a1" }, { entityType: "account", entityId: "a2" }]) },
  pluginLog: { deleteMany: jest.fn(), count: jest.fn(async () => 7) },
};
jest.mock("@/lib/prisma-base", () => ({ prismaBase: db }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/inngest/client", () => ({ inngest: { send: jest.fn() } }));
jest.mock("@/lib/email-crypto", () => ({ encrypt: (s: string) => `enc:${s}`, decrypt: (s: string) => s.replace(/^enc:/, "") }));
const onUninstall = jest.fn();
const plugin = {
  source: "public" as const, messages: {},
  definition: definePlugin({
    id: "demo", name: "Demo", version: "1.0.0", sdk: "^0.1.0", description: "", permissions: [],
    settings: z.object({ days: z.number().default(90) }), secrets: z.object({ apiKey: z.string() }),
    extensions: () => {}, onUninstall,
  }),
};
const old = { ...plugin, definition: { ...plugin.definition, id: "old-sdk", sdk: "^9.0.0" } };
jest.mock("@/lib/plugins/registry", () => ({ findPlugin: (id: string) => ({ demo: plugin, "old-sdk": old } as any)[id] }));
const getPluginState = jest.fn();
jest.mock("@/lib/plugins/state", () => ({ getPluginState: (...a: unknown[]) => getPluginState(...a), invalidatePluginCache: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({})) }));

import { exportPluginData, getUninstallSummary, installPlugin, savePluginSettings, uninstallPlugin } from "@/lib/plugins/lifecycle";
import { inngest } from "@/inngest/client";

beforeEach(() => jest.clearAllMocks());

it("installs with parsed settings and encrypted secrets, then queues onInstall", async () => {
  getPluginState.mockResolvedValue(undefined);
  await installPlugin("demo", "u1", { settings: {}, secrets: { apiKey: "k" } });
  expect(db.installedPlugin.create).toHaveBeenCalledWith({ data: {
    id: "demo", version: "1.0.0", status: "ENABLED", settings: { days: 90 }, secrets: 'enc:{"apiKey":"k"}', installedBy: "u1",
  } });
  expect(inngest.send).toHaveBeenCalledWith({ name: "plugin/installed", data: { pluginId: "demo" } });
});

it("refuses unknown, duplicate and incompatible plugins", async () => {
  getPluginState.mockResolvedValue(undefined);
  await expect(installPlugin("nope", "u1", { settings: {}, secrets: {} })).rejects.toThrow("Plugin not found");
  await expect(installPlugin("old-sdk", "u1", { settings: {}, secrets: { apiKey: "k" } })).rejects.toThrow("Incompatible SDK: requires ^9.0.0, running 0.1.0");
  getPluginState.mockResolvedValue({ id: "demo" });
  await expect(installPlugin("demo", "u1", { settings: {}, secrets: {} })).rejects.toThrow("Plugin already installed");
});

it("keeps existing secrets when a secret field is submitted empty", async () => {
  getPluginState.mockResolvedValue({ id: "demo", secrets: 'enc:{"apiKey":"old"}', settings: {} });
  await savePluginSettings("demo", "u1", { settings: { days: 30 }, secrets: { apiKey: "" } });
  expect(db.installedPlugin.update).toHaveBeenCalledWith({ where: { id: "demo" }, data: { settings: { days: 30 }, secrets: 'enc:{"apiKey":"old"}' } });
});

it("summarises, exports and uninstalls", async () => {
  getPluginState.mockResolvedValue({ id: "demo", settings: { days: 90 }, secrets: null });
  await expect(getUninstallSummary("demo")).resolves.toEqual({ entries: 5, records: 2, logLines: 7 });
  const exp = await exportPluginData("demo");
  expect(exp).toMatchObject({ pluginId: "demo", settings: { days: 90 }, data: [{ entityType: "account", entityId: "a1", key: "k", value: 1 }] });
  await uninstallPlugin("demo", "u1");
  expect(onUninstall).toHaveBeenCalled();
  expect(db.pluginData.deleteMany).toHaveBeenCalledWith({ where: { pluginId: "demo" } });
  expect(db.pluginLog.deleteMany).toHaveBeenCalledWith({ where: { pluginId: "demo" } });
  expect(db.installedPlugin.delete).toHaveBeenCalledWith({ where: { id: "demo" } });
});

it("uninstalls a missing plugin without calling code (Review Focus 2)", async () => {
  getPluginState.mockResolvedValue({ id: "ghost", settings: {}, secrets: null });
  await uninstallPlugin("ghost", "u1");
  expect(db.installedPlugin.delete).toHaveBeenCalledWith({ where: { id: "ghost" } });
});
```

- [ ] **Step 2: Run — FAIL. Step 3: write `lib/plugins/lifecycle.ts`**

```ts
import { SDK_VERSION, satisfiesSdkRange } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import { writeAuditLog } from "@/lib/audit-log";
import { inngest } from "@/inngest/client";
import { findPlugin } from "./registry";
import { getPluginState, invalidatePluginCache } from "./state";
import { decryptSecrets, encryptSecrets } from "./settings";
import { createPluginContext } from "./context";
import { runAsActor } from "./actor";
import { writePluginLog } from "./log";

type Input = { settings: Record<string, unknown>; secrets: Record<string, unknown> };

const audit = (id: string, userId: string, action: "installed" | "uninstalled" | "enabled" | "disabled" | "settings_changed") =>
  writeAuditLog({ entityType: "plugin", entityId: id, action, changes: null, userId });

export async function installPlugin(id: string, userId: string, input: Input): Promise<void> {
  const plugin = findPlugin(id);
  if (!plugin) throw new Error("Plugin not found");
  if (await getPluginState(id)) throw new Error("Plugin already installed");
  const { definition } = plugin;
  if (!satisfiesSdkRange(definition.sdk)) throw new Error(`Incompatible SDK: requires ${definition.sdk}, running ${SDK_VERSION}`);
  const settings = definition.settings.parse(input.settings);
  const secrets = definition.secrets.parse(input.secrets);
  await prismaBase.installedPlugin.create({
    data: { id, version: definition.version, status: "ENABLED", settings: settings as never, secrets: encryptSecrets(secrets), installedBy: userId },
  });
  invalidatePluginCache();
  await audit(id, userId, "installed");
  await inngest.send({ name: "plugin/installed", data: { pluginId: id } });
}

export async function setPluginEnabled(id: string, userId: string, enabled: boolean): Promise<void> {
  await prismaBase.installedPlugin.update({ where: { id }, data: { status: enabled ? "ENABLED" : "DISABLED" } });
  invalidatePluginCache();
  await audit(id, userId, enabled ? "enabled" : "disabled");
}

export async function savePluginSettings(id: string, userId: string, input: Input): Promise<void> {
  const plugin = findPlugin(id);
  const state = await getPluginState(id);
  if (!plugin || !state) throw new Error("Plugin not installed");
  const settings = plugin.definition.settings.parse(input.settings);
  const existing = decryptSecrets(state.secrets);
  const submitted = Object.fromEntries(Object.entries(input.secrets).filter(([, v]) => v !== "" && v !== undefined));
  const secrets = plugin.definition.secrets.parse({ ...existing, ...submitted });
  await prismaBase.installedPlugin.update({ where: { id }, data: { settings: settings as never, secrets: encryptSecrets(secrets) } });
  invalidatePluginCache();
  await audit(id, userId, "settings_changed");
}

export async function getUninstallSummary(id: string) {
  const [entries, groups, logLines] = await Promise.all([
    prismaBase.pluginData.count({ where: { pluginId: id } }),
    prismaBase.pluginData.groupBy({ by: ["entityType", "entityId"], where: { pluginId: id, NOT: { entityId: "" } } }),
    prismaBase.pluginLog.count({ where: { pluginId: id } }),
  ]);
  return { entries, records: groups.length, logLines };
}

export async function exportPluginData(id: string) {
  const state = await getPluginState(id);
  const rows = await prismaBase.pluginData.findMany({ where: { pluginId: id }, orderBy: [{ entityType: "asc" }, { entityId: "asc" }, { key: "asc" }] });
  return {
    pluginId: id,
    exportedAt: new Date().toISOString(),
    settings: state?.settings ?? {},
    data: rows.map((r: any) => ({ entityType: r.entityType, entityId: r.entityId, key: r.key, value: r.value })),
  };
}

export async function uninstallPlugin(id: string, userId: string): Promise<void> {
  const plugin = findPlugin(id);
  if (plugin?.definition.onUninstall) {
    try {
      const actor = { type: "plugin" as const, pluginId: id };
      const ctx = await createPluginContext({ plugin, actor });
      await runAsActor(actor, () => plugin.definition.onUninstall!(ctx));
    } catch (e) {
      writePluginLog(id, "error", `onUninstall failed: ${String(e)}`);
    }
  }
  await prismaBase.pluginData.deleteMany({ where: { pluginId: id } });
  await prismaBase.pluginLog.deleteMany({ where: { pluginId: id } });
  await prismaBase.installedPlugin.delete({ where: { id } });
  invalidatePluginCache();
  await audit(id, userId, "uninstalled");
}
```

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Write the failing upgrade test** `lib/plugins/__tests__/upgrade.test.ts`

```ts
import { definePlugin } from "@nextcrm/plugin-sdk";

const db = {
  $queryRaw: jest.fn(async () => [{ locked: true }]),
  $executeRaw: jest.fn(),
  installedPlugin: { findMany: jest.fn(), update: jest.fn() },
};
jest.mock("@/lib/prisma-base", () => ({ prismaBase: db }));
jest.mock("@/lib/audit-log", () => ({ writeAuditLog: jest.fn() }));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({})) }));
jest.mock("@/lib/plugins/state", () => ({ invalidatePluginCache: jest.fn() }));
jest.mock("@/lib/plugins/log", () => ({ writePluginLog: jest.fn() }));
const onUpgrade = jest.fn();
const failing = jest.fn(async () => { throw new Error("bad"); });
const mk = (id: string, version: string, fn: any) => ({ source: "public", messages: {}, definition: definePlugin({ id, name: id, version, sdk: "^0.1.0", description: "", permissions: [], extensions: () => {}, onUpgrade: fn }) });
jest.mock("@/lib/plugins/registry", () => ({ getRegistry: () => [mk("up", "1.1.0", onUpgrade), mk("same", "1.0.0", onUpgrade), mk("broken", "2.0.0", failing)] }));

import { runPluginUpgrades } from "@/lib/plugins/upgrade";

it("runs onUpgrade for newer image versions, disables on failure, ignores missing", async () => {
  db.installedPlugin.findMany.mockResolvedValue([
    { id: "up", version: "1.0.0", status: "ENABLED" },
    { id: "same", version: "1.0.0", status: "ENABLED" },
    { id: "broken", version: "1.0.0", status: "ENABLED" },
    { id: "ghost", version: "1.0.0", status: "ENABLED" },
  ]);
  await runPluginUpgrades();
  expect(onUpgrade).toHaveBeenCalledTimes(1);
  expect(onUpgrade).toHaveBeenCalledWith({}, "1.0.0");
  expect(db.installedPlugin.update).toHaveBeenCalledWith({ where: { id: "up" }, data: { version: "1.1.0" } });
  expect(db.installedPlugin.update).toHaveBeenCalledWith({ where: { id: "broken" }, data: { status: "DISABLED" } });
  expect(db.$executeRaw).toHaveBeenCalled(); // unlock
});

it("does nothing when another replica holds the lock", async () => {
  db.$queryRaw.mockResolvedValueOnce([{ locked: false }]);
  db.installedPlugin.findMany.mockClear();
  await runPluginUpgrades();
  expect(db.installedPlugin.findMany).not.toHaveBeenCalled();
});
```

- [ ] **Step 6: Run — FAIL. Step 7: write `lib/plugins/upgrade.ts`**

```ts
import { compareVersions } from "@nextcrm/plugin-sdk";
import { prismaBase } from "@/lib/prisma-base";
import { writeAuditLog } from "@/lib/audit-log";
import { getRegistry } from "./registry";
import { createPluginContext } from "./context";
import { runAsActor } from "./actor";
import { invalidatePluginCache } from "./state";
import { writePluginLog } from "./log";

const LOCK_KEY = 735_201_004; // arbitrary constant for pg advisory lock

export async function runPluginUpgrades(): Promise<void> {
  const [{ locked }] = await prismaBase.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_lock(${LOCK_KEY}) AS locked`;
  if (!locked) return;
  try {
    const rows = await prismaBase.installedPlugin.findMany();
    const registry = new Map(getRegistry().map((p) => [p.definition.id, p]));
    for (const row of rows) {
      const plugin = registry.get(row.id);
      if (!plugin || compareVersions(plugin.definition.version, row.version) <= 0) continue;
      try {
        if (plugin.definition.onUpgrade) {
          const actor = { type: "plugin" as const, pluginId: row.id };
          const ctx = await createPluginContext({ plugin, actor });
          await runAsActor(actor, () => plugin.definition.onUpgrade!(ctx, row.version));
        }
        await prismaBase.installedPlugin.update({ where: { id: row.id }, data: { version: plugin.definition.version } });
        await writeAuditLog({ entityType: "plugin", entityId: row.id, action: "upgraded", changes: null, userId: null });
      } catch (e) {
        writePluginLog(row.id, "error", `onUpgrade from ${row.version} failed: ${String(e)}`);
        await prismaBase.installedPlugin.update({ where: { id: row.id }, data: { status: "DISABLED" } });
      }
    }
    invalidatePluginCache();
  } finally {
    await prismaBase.$executeRaw`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}
```

Admin notification on upgrade failure is the disabled status plus the error log line shown on the admin page (Task 10); no e-mail in v0.

- [ ] **Step 8: Run — PASS. Step 9: create `instrumentation.ts`** at the repo root:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_ENV_VALIDATION === "1") return; // docker build stage has no DB
  const { runPluginUpgrades } = await import("@/lib/plugins/upgrade");
  await runPluginUpgrades().catch((e) => console.error("[PLUGIN_UPGRADE]", e));
}
```

Check the Dockerfile runner stage does not set `SKIP_ENV_VALIDATION`; only the build stage does.

- [ ] **Step 10: Typecheck + commit**

```bash
git add lib/plugins/lifecycle.ts lib/plugins/upgrade.ts lib/plugins/__tests__/lifecycle.test.ts lib/plugins/__tests__/upgrade.test.ts instrumentation.ts
git commit -m "feat(plugins): install/enable/disable/uninstall and upgrades on start"
```

---

### Task 10: Admin UI — plugin list and detail

**Files:**
- Create: `app/[locale]/(routes)/admin/plugins/page.tsx`, `app/[locale]/(routes)/admin/plugins/[pluginId]/page.tsx`, `app/[locale]/(routes)/admin/plugins/_actions/plugins.ts`, `app/[locale]/(routes)/admin/plugins/_components/PluginSettingsForm.tsx`, `.../_components/PluginStatusControls.tsx`, `.../_components/UninstallDialog.tsx`, `.../_components/PluginLogTable.tsx`, `app/api/admin/plugins/[pluginId]/export/route.ts`, `lib/plugins/ui/PluginErrorBoundary.tsx`
- Modify: `app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx`
- Test: `app/[locale]/(routes)/admin/plugins/_actions/__tests__/plugins.test.ts`

**Interfaces:**
- Consumes: `listPluginsForAdmin`, `getPluginState`, `findPlugin`, `describeSettingsSchema`, `decryptSecrets`, lifecycle functions, `requireRole`, `createPluginContext`, `prismaBase.pluginLog`.
- Produces: server actions `installPluginAction(id, settings, secrets)`, `setPluginEnabledAction(id, enabled)`, `savePluginSettingsAction(id, settings, secrets)`, `uninstallPluginAction(id)` — each `Promise<{ ok: boolean; error?: string }>`; `getSecretFlags(id): Promise<Record<string, boolean>>`; `PluginErrorBoundary` client component (`{ pluginId: string; fallback: string; children }`).

- [ ] **Step 1: Write the failing actions test** `app/[locale]/(routes)/admin/plugins/_actions/__tests__/plugins.test.ts`

```ts
jest.mock("@/lib/authz", () => ({
  requireRole: jest.fn(async () => ({ id: "admin-1", role: "admin" })),
  AuthenticationError: class AuthenticationError extends Error {},
  AuthorizationError: class AuthorizationError extends Error {},
}));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
const lifecycle = {
  installPlugin: jest.fn(), setPluginEnabled: jest.fn(), savePluginSettings: jest.fn(), uninstallPlugin: jest.fn(),
};
jest.mock("@/lib/plugins/lifecycle", () => lifecycle);
jest.mock("@/lib/plugins/state", () => ({ getPluginState: jest.fn(async () => ({ id: "demo", secrets: "cipher" })) }));
jest.mock("@/lib/plugins/settings", () => ({ decryptSecrets: () => ({ apiKey: "very-secret", empty: "" }) }));

import { getSecretFlags, installPluginAction, savePluginSettingsAction } from "../plugins";
import { requireRole, AuthorizationError } from "@/lib/authz";

it("returns only boolean flags for secrets (Review Focus 4)", async () => {
  const flags = await getSecretFlags("demo");
  expect(flags).toEqual({ apiKey: true, empty: false });
  expect(JSON.stringify(flags)).not.toContain("very-secret");
});

it("maps lifecycle errors to { ok: false, error } and never echoes secrets", async () => {
  lifecycle.savePluginSettings.mockRejectedValueOnce(new Error("Invalid input"));
  const res = await savePluginSettingsAction("demo", { days: 1 }, { apiKey: "new-secret" });
  expect(res).toEqual({ ok: false, error: "Invalid input" });
  expect(JSON.stringify(res)).not.toContain("new-secret");
});

it("rejects non-admins", async () => {
  (requireRole as jest.Mock).mockRejectedValueOnce(new (AuthorizationError as any)("no"));
  await expect(installPluginAction("demo", {}, {})).resolves.toEqual({ ok: false, error: "Forbidden" });
  expect(lifecycle.installPlugin).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run — FAIL. Step 3: write `_actions/plugins.ts`**

```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { installPlugin, savePluginSettings, setPluginEnabled, uninstallPlugin } from "@/lib/plugins/lifecycle";
import { getPluginState } from "@/lib/plugins/state";
import { decryptSecrets } from "@/lib/plugins/settings";

type Result = { ok: boolean; error?: string };
type Values = Record<string, unknown>;

async function asAdmin(fn: (userId: string) => Promise<void>, path = "/admin/plugins"): Promise<Result> {
  let userId: string;
  try {
    userId = (await requireRole(["admin"])).id;
  } catch (e) {
    if (e instanceof AuthenticationError) return { ok: false, error: "Unauthorized" };
    if (e instanceof AuthorizationError) return { ok: false, error: "Forbidden" };
    throw e;
  }
  try {
    await fn(userId);
    revalidatePath(path);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
}

export const installPluginAction = async (id: string, settings: Values, secrets: Values) =>
  asAdmin((u) => installPlugin(id, u, { settings, secrets }));
export const setPluginEnabledAction = async (id: string, enabled: boolean) =>
  asAdmin((u) => setPluginEnabled(id, u, enabled));
export const savePluginSettingsAction = async (id: string, settings: Values, secrets: Values) =>
  asAdmin((u) => savePluginSettings(id, u, { settings, secrets }));
export const uninstallPluginAction = async (id: string) =>
  asAdmin((u) => uninstallPlugin(id, u));

export async function getSecretFlags(id: string): Promise<Record<string, boolean>> {
  await requireRole(["admin"]);
  const state = await getPluginState(id);
  const secrets = decryptSecrets(state?.secrets ?? null);
  return Object.fromEntries(Object.entries(secrets).map(([k, v]) => [k, v !== "" && v != null]));
}
```

Note: zod errors stringify to JSON containing the issue path and message, not the submitted value, for `string`/`number`/`enum` checks; the test pins that `error` never contains the secret.

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Error boundary** `lib/plugins/ui/PluginErrorBoundary.tsx`

```tsx
"use client";
import { Component, type ReactNode } from "react";

interface Props { pluginId: string; fallback: string; children: ReactNode }

export class PluginErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { console.error(`[PLUGIN_UI] ${this.props.pluginId}`, error); }
  render() {
    if (this.state.failed) return <p className="text-sm text-muted-foreground">{this.props.fallback}</p>;
    return this.props.children;
  }
}
```

Server-side render errors of an async plugin component are serialised into the RSC payload and re-thrown at this boundary on the client, so the page still renders. Server-side logging of those errors: the slot wrapper in Task 11 catches them first and writes `PluginLog`.

- [ ] **Step 6: Settings form** `_components/PluginSettingsForm.tsx` — generic form driven by `SettingsField[]`:

```tsx
"use client";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import type { SettingsField } from "@/lib/plugins/settings";
import { installPluginAction, savePluginSettingsAction } from "../_actions/plugins";

interface Props {
  pluginId: string;
  mode: "install" | "save";
  fields: SettingsField[];
  secretFields: SettingsField[];
  values: Record<string, unknown>;
  secretFlags: Record<string, boolean>;
  permissions: string[];
}

export function PluginSettingsForm({ pluginId, mode, fields, secretFields, values, secretFlags, permissions }: Props) {
  const t = useTranslations("Plugins.admin");
  const [pending, start] = useTransition();
  const [granted, setGranted] = useState(mode === "save");
  const [state, setState] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, values[f.key] ?? f.defaultValue ?? (f.kind === "boolean" ? false : "")])),
  );
  const [secrets, setSecrets] = useState<Record<string, string>>({});

  const coerce = () =>
    Object.fromEntries(fields.map((f) => {
      const v = state[f.key];
      if (f.kind === "number") return [f.key, v === "" ? undefined : Number(v)];
      if (v === "" && !f.required) return [f.key, undefined];
      return [f.key, v];
    }));

  const submit = () =>
    start(async () => {
      const action = mode === "install" ? installPluginAction : savePluginSettingsAction;
      const res = await action(pluginId, coerce(), secrets);
      if (res.ok) toast.success(t("saved")); else toast.error(res.error ?? "Error");
    });

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {fields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={`setting-${f.key}`}>{f.key}{f.required ? " *" : ""}</Label>
          {f.kind === "boolean" ? (
            <Switch id={`setting-${f.key}`} checked={Boolean(state[f.key])} onCheckedChange={(v) => setState({ ...state, [f.key]: v })} />
          ) : f.kind === "enum" ? (
            <select id={`setting-${f.key}`} className="border rounded-md h-9 px-2 bg-background" value={String(state[f.key] ?? "")}
              onChange={(e) => setState({ ...state, [f.key]: e.target.value })}>
              {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <Input id={`setting-${f.key}`} type={f.kind === "number" ? "number" : "text"} value={String(state[f.key] ?? "")}
              onChange={(e) => setState({ ...state, [f.key]: e.target.value })} />
          )}
        </div>
      ))}
      {secretFields.length > 0 && <h3 className="text-sm font-medium pt-2">{t("secrets")}</h3>}
      {secretFields.map((f) => (
        <div key={f.key} className="space-y-1">
          <Label htmlFor={`secret-${f.key}`}>{f.key}{f.required ? " *" : ""}</Label>
          <Input id={`secret-${f.key}`} type="password" autoComplete="off"
            placeholder={secretFlags[f.key] ? t("secretSet") : ""}
            value={secrets[f.key] ?? ""} onChange={(e) => setSecrets({ ...secrets, [f.key]: e.target.value })} />
        </div>
      ))}
      {mode === "install" && (
        <div className="space-y-2 border rounded-md p-3">
          <p className="text-sm font-medium">{t("permissions")}</p>
          <ul className="text-sm list-disc pl-5">{permissions.map((p) => <li key={p}><code>{p}</code></li>)}</ul>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox id="grant-permissions" checked={granted} onCheckedChange={(v) => setGranted(v === true)} />
            {t("confirmPermissions")}
          </label>
        </div>
      )}
      <Button type="submit" disabled={pending || !granted}>{mode === "install" ? t("install") : t("save")}</Button>
    </form>
  );
}
```

Confirm `components/ui/label.tsx`, `switch.tsx`, `checkbox.tsx`, `button.tsx` exist (`ls components/ui`); if `checkbox` is missing, add it with `pnpm dlx shadcn@latest add checkbox`.

- [ ] **Step 7: Status controls, uninstall dialog, log table**

`_components/PluginStatusControls.tsx`:
```tsx
"use client";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setPluginEnabledAction } from "../_actions/plugins";

export function PluginStatusControls({ pluginId, enabled }: { pluginId: string; enabled: boolean }) {
  const t = useTranslations("Plugins.admin");
  const [pending, start] = useTransition();
  const toggle = () => start(async () => {
    const res = await setPluginEnabledAction(pluginId, !enabled);
    if (!res.ok) toast.error(res.error ?? "Error");
  });
  return <Button variant="outline" disabled={pending} onClick={toggle}>{enabled ? t("disable") : t("enable")}</Button>;
}
```

`_components/UninstallDialog.tsx`:
```tsx
"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { uninstallPluginAction } from "../_actions/plugins";

export function UninstallDialog(props: { pluginId: string; name: string; entries: number; records: number }) {
  const t = useTranslations("Plugins.admin");
  const router = useRouter();
  const [pending, start] = useTransition();
  const confirm = () => start(async () => {
    const res = await uninstallPluginAction(props.pluginId);
    if (res.ok) router.push("/admin/plugins"); else toast.error(res.error ?? "Error");
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild><Button variant="destructive">{t("uninstall")}</Button></AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("uninstallTitle", { name: props.name })}</AlertDialogTitle>
          <AlertDialogDescription>{t("uninstallBody", { entries: props.entries, records: props.records })}</AlertDialogDescription>
        </AlertDialogHeader>
        <a className="text-sm underline" href={`/api/admin/plugins/${props.pluginId}/export`}>{t("export")}</a>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={confirm}>{t("confirmUninstall")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

`_components/PluginLogTable.tsx` (server component):
```tsx
import { prismaBase } from "@/lib/prisma-base";

export async function PluginLogTable({ pluginId }: { pluginId: string }) {
  const rows = await prismaBase.pluginLog.findMany({ where: { pluginId }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b align-top">
              <td className="py-1 pr-3 whitespace-nowrap tabular-nums">{r.createdAt.toISOString().replace("T", " ").slice(0, 19)}</td>
              <td className="py-1 pr-3 uppercase">{r.level}</td>
              <td className="py-1 break-all">{r.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 8: Export route** `app/api/admin/plugins/[pluginId]/export/route.ts`

```ts
import { NextResponse } from "next/server";
import { requireRole, AuthenticationError, AuthorizationError } from "@/lib/authz";
import { exportPluginData } from "@/lib/plugins/lifecycle";

export async function GET(_req: Request, { params }: { params: Promise<{ pluginId: string }> }) {
  try { await requireRole(["admin"]); } catch (e) {
    if (e instanceof AuthenticationError) return new NextResponse("Unauthorized", { status: 401 });
    if (e instanceof AuthorizationError) return new NextResponse("Forbidden", { status: 403 });
    throw e;
  }
  const { pluginId } = await params;
  const body = JSON.stringify(await exportPluginData(pluginId), null, 2);
  return new NextResponse(body, {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${pluginId}-export.json"` },
  });
}
```

Settings in the export are non-secret settings only (secrets are a separate column and are not exported).

- [ ] **Step 9: List page** `admin/plugins/page.tsx`

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPluginsForAdmin } from "@/lib/plugins/state";

const STATUS_KEY = { NOT_INSTALLED: "notInstalled", ENABLED: "enabled", DISABLED: "disabled", MISSING: "missing" } as const;

export default async function PluginsPage() {
  const t = await getTranslations("Plugins.admin");
  const plugins = await listPluginsForAdmin();
  return (
    <Card>
      <CardHeader><CardTitle>{t("title")}</CardTitle></CardHeader>
      <CardContent className="divide-y">
        {plugins.map((p) => (
          <Link key={p.id} href={`/admin/plugins/${p.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-muted/50 px-2 rounded">
            <div className="min-w-0">
              <p className="font-medium">{p.name} <span className="text-xs text-muted-foreground">{p.version ?? p.installedVersion}</span></p>
              <p className="text-sm text-muted-foreground truncate">{p.description}</p>
            </div>
            <Badge variant={p.status === "ENABLED" ? "default" : "secondary"}>{t(STATUS_KEY[p.status])}</Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 10: Detail page** `admin/plugins/[pluginId]/page.tsx`

```tsx
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@nextcrm/plugin-sdk";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/authz";
import { findPlugin } from "@/lib/plugins/registry";
import { getPluginState, listPluginsForAdmin } from "@/lib/plugins/state";
import { describeSettingsSchema, parseStoredSettings } from "@/lib/plugins/settings";
import { getUninstallSummary } from "@/lib/plugins/lifecycle";
import { createPluginContext } from "@/lib/plugins/context";
import { PluginErrorBoundary } from "@/lib/plugins/ui/PluginErrorBoundary";
import { getSecretFlags } from "../_actions/plugins";
import { PluginSettingsForm } from "../_components/PluginSettingsForm";
import { PluginStatusControls } from "../_components/PluginStatusControls";
import { UninstallDialog } from "../_components/UninstallDialog";
import { PluginLogTable } from "../_components/PluginLogTable";

export default async function PluginDetailPage({ params }: { params: Promise<{ pluginId: string }> }) {
  const { pluginId } = await params;
  const admin = await requireRole(["admin"]);
  const t = await getTranslations("Plugins.admin");
  const row = (await listPluginsForAdmin()).find((p) => p.id === pluginId);
  if (!row) notFound();
  const plugin = findPlugin(pluginId);
  const state = await getPluginState(pluginId);
  const summary = state ? await getUninstallSummary(pluginId) : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{row.name}</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{row.description}</p>
          {state && plugin && state.version !== plugin.definition.version && (
            <p>{t("upgradePending", { from: state.version, to: plugin.definition.version })}</p>
          )}
          {row.status === "MISSING" && <p>{t("missing")}</p>}
          <div className="flex flex-wrap gap-2">
            {state && plugin && <PluginStatusControls pluginId={pluginId} enabled={state.status === "ENABLED"} />}
            {state && summary && <UninstallDialog pluginId={pluginId} name={row.name} entries={summary.entries} records={summary.records} />}
          </div>
        </CardContent>
      </Card>

      {plugin && (
        <Card>
          <CardHeader><CardTitle>{t("settings")}</CardTitle></CardHeader>
          <CardContent>
            <PluginSettingsForm
              pluginId={pluginId}
              mode={state ? "save" : "install"}
              fields={describeSettingsSchema(plugin.definition.settings)}
              secretFields={describeSettingsSchema(plugin.definition.secrets)}
              values={state ? parseStoredSettings(plugin.definition.settings, state.settings, () => {}) : {}}
              secretFlags={state ? await getSecretFlags(pluginId) : {}}
              permissions={plugin.definition.permissions}
            />
          </CardContent>
        </Card>
      )}

      {plugin && state?.status === "ENABLED" && plugin.definition.extensions.adminSections.length > 0 && (
        <AdminSections pluginId={pluginId} userId={admin.id} />
      )}

      {state && (
        <Card>
          <CardHeader><CardTitle>{t("log")}</CardTitle></CardHeader>
          <CardContent><PluginLogTable pluginId={pluginId} /></CardContent>
        </Card>
      )}
    </div>
  );
}

async function AdminSections({ pluginId, userId }: { pluginId: string; userId: string }) {
  const plugin = findPlugin(pluginId)!;
  const t = await getTranslations("Plugins");
  const ctx = await createPluginContext({ plugin, actor: { type: "user", userId, role: "admin" }, locale: (await getLocale()) as Locale });
  return (
    <>
      {plugin.definition.extensions.adminSections.map((Section, i) => (
        <PluginErrorBoundary key={i} pluginId={pluginId} fallback={t("sectionUnavailable")}>
          <Section ctx={ctx} />
        </PluginErrorBoundary>
      ))}
    </>
  );
}
```

- [ ] **Step 11: Sidebar.** In `AdminSidebarNav.tsx` import `Puzzle` from `lucide-react` and append `{ label: "Plugins", href: "/admin/plugins", icon: Puzzle }` to `navItems`.

- [ ] **Step 12: Manual check.** With a local DB (`pnpm db:up && pnpm db:migrate && pnpm dev`), sign in as admin, open `/admin/plugins` — expect an empty card with the title "Plugins". (Plugin flows are exercised with the fixture in Task 14.)

- [ ] **Step 13: Typecheck + tests + commit**

```bash
pnpm exec tsc --noEmit && pnpm exec jest "app/\[locale\]/\(routes\)/admin/plugins"
git add "app/[locale]/(routes)/admin/plugins" "app/[locale]/(routes)/admin/_components/AdminSidebarNav.tsx" app/api/admin/plugins lib/plugins/ui
git commit -m "feat(plugins): admin UI for plugin lifecycle and settings"
```

---

### Task 11: Account tabs, account panels and plugin pages

**Files:**
- Create: `lib/plugins/slots.ts`, `lib/plugins/ui/PluginSlot.tsx`, `app/[locale]/(routes)/p/[pluginId]/[...path]/page.tsx`
- Modify: `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx`
- Test: `lib/plugins/__tests__/slots.test.ts`

**Interfaces:**
- Consumes: `getEnabledPlugins`, `createPluginContext`, `PluginErrorBoundary`, `writePluginLog`, `requireAuthenticated`.
- Produces: `getAccountTabs(role): Promise<{ plugin: RegisteredPlugin; tab: AccountTabRegistration }[]>`, `getAccountPanels(role)`, `findPluginPage(pluginId, path: string[], role): Promise<{ plugin; page } | null>`, `getCompanyRegistryProviders(): Promise<{ plugin; provider }[]>`; `PluginSlot` server component `{ plugin; actor; render: (ctx) => ReactNode | Promise<ReactNode> }`.

- [ ] **Step 1: Write the failing slots test** `lib/plugins/__tests__/slots.test.ts`

```ts
import { definePlugin } from "@nextcrm/plugin-sdk";
const Comp = () => null;
const plugins = [
  { source: "public", messages: {}, definition: definePlugin({ id: "p-one", name: "One", version: "1.0.0", sdk: "^0.1.0", description: "", permissions: [],
    extensions: (x) => {
      x.accountTab({ id: "all", title: "t.all", component: Comp });
      x.accountTab({ id: "mgr", title: "t.mgr", component: Comp, roles: ["manager", "admin"] });
      x.accountPanel({ id: "panel", component: Comp });
      x.page({ path: "expiring", title: "p.exp", component: Comp, roles: ["manager"] });
      x.page({ path: "a/b", title: "p.ab", component: Comp });
      x.companyRegistry({ countries: ["CZ"], lookup: async () => null });
    } }) },
];
jest.mock("@/lib/plugins/state", () => ({ getEnabledPlugins: jest.fn(async () => plugins) }));
import { findPluginPage, getAccountPanels, getAccountTabs, getCompanyRegistryProviders } from "@/lib/plugins/slots";

it("filters tabs and panels by role", async () => {
  expect((await getAccountTabs("user")).map((s) => s.tab.id)).toEqual(["all"]);
  expect((await getAccountTabs("manager")).map((s) => s.tab.id)).toEqual(["all", "mgr"]);
  expect(await getAccountPanels("user")).toHaveLength(1);
});

it("finds pages by joined path and role", async () => {
  expect(await findPluginPage("p-one", ["expiring"], "user")).toBeNull();
  expect((await findPluginPage("p-one", ["expiring"], "manager"))?.page.path).toBe("expiring");
  expect((await findPluginPage("p-one", ["a", "b"], "user"))?.page.path).toBe("a/b");
  expect(await findPluginPage("other", ["a", "b"], "admin")).toBeNull();
});

it("lists registry providers of enabled plugins", async () => {
  expect((await getCompanyRegistryProviders()).map((r) => r.provider.countries)).toEqual([["CZ"]]);
});
```

- [ ] **Step 2: Run — FAIL. Step 3: write `lib/plugins/slots.ts`**

```ts
import type { AccountPanelRegistration, AccountTabRegistration, CompanyRegistryProvider, PageRegistration, Role } from "@nextcrm/plugin-sdk";
import type { RegisteredPlugin } from "./registry";
import { getEnabledPlugins } from "./state";

export async function getAccountTabs(role: Role) {
  const out: { plugin: RegisteredPlugin; tab: AccountTabRegistration }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    for (const tab of plugin.definition.extensions.accountTabs) if (tab.roles.includes(role)) out.push({ plugin, tab });
  }
  return out;
}

export async function getAccountPanels(role: Role) {
  const out: { plugin: RegisteredPlugin; panel: AccountPanelRegistration }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    for (const panel of plugin.definition.extensions.accountPanels) if (panel.roles.includes(role)) out.push({ plugin, panel });
  }
  return out;
}

export async function findPluginPage(pluginId: string, path: string[], role: Role) {
  const plugin = (await getEnabledPlugins()).find((p) => p.definition.id === pluginId);
  const page = plugin?.definition.extensions.pages.find((p) => p.path === path.join("/"));
  if (!plugin || !page || !page.roles.includes(role)) return null;
  return { plugin, page } as { plugin: RegisteredPlugin; page: PageRegistration };
}

export async function getCompanyRegistryProviders() {
  const out: { plugin: RegisteredPlugin; provider: CompanyRegistryProvider }[] = [];
  for (const plugin of await getEnabledPlugins()) {
    for (const provider of plugin.definition.extensions.companyRegistries) out.push({ plugin, provider });
  }
  return out;
}
```

Run — PASS.

- [ ] **Step 4: `lib/plugins/ui/PluginSlot.tsx`** — server wrapper that logs server-side render failures and wraps in the client boundary:

```tsx
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import type { Actor, Locale, PluginContext } from "@nextcrm/plugin-sdk";
import type { RegisteredPlugin } from "../registry";
import { createPluginContext } from "../context";
import { writePluginLog } from "../log";
import { PluginErrorBoundary } from "./PluginErrorBoundary";

export async function PluginSlot(props: { plugin: RegisteredPlugin; actor: Actor; render: (ctx: PluginContext) => ReactNode | Promise<ReactNode> }) {
  const t = await getTranslations("Plugins");
  const id = props.plugin.definition.id;
  let content: ReactNode;
  try {
    const ctx = await createPluginContext({ plugin: props.plugin, actor: props.actor, locale: (await getLocale()) as Locale });
    content = await props.render(ctx);
  } catch (e) {
    writePluginLog(id, "error", `UI render failed: ${String(e)}`);
    return <p className="text-sm text-muted-foreground">{t("sectionUnavailable")}</p>;
  }
  return <PluginErrorBoundary pluginId={id} fallback={t("sectionUnavailable")}>{content}</PluginErrorBoundary>;
}
```

`render` calls the plugin component as a function (`(ctx) => Tab({ accountId, ctx })`) so async errors in the component's own body are caught here; errors in nested children still reach the client boundary.

- [ ] **Step 5: Account page.** In `app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx`:
  - after the existing session line, add:

```tsx
const actorUser = await requireAuthenticated();
const actor = { type: "user" as const, userId: actorUser.id, role: actorUser.role };
const [pluginTabs, pluginPanels] = await Promise.all([getAccountTabs(actorUser.role), getAccountPanels(actorUser.role)]);
```

  - inside `<TabsList>` after the History trigger:

```tsx
{await Promise.all(pluginTabs.map(async ({ plugin, tab }) => {
  const t = await getTranslations(`plugins.${plugin.definition.id}` as never);
  return <TabsTrigger key={`${plugin.definition.id}:${tab.id}`} value={`plugin-${plugin.definition.id}-${tab.id}`}>{t(tab.title as never)}</TabsTrigger>;
}))}
```

  - directly after `<BasicView data={account} />`:

```tsx
{pluginPanels.map(({ plugin, panel }) => (
  <PluginSlot key={`${plugin.definition.id}:${panel.id}`} plugin={plugin} actor={actor} render={(ctx) => panel.component({ accountId: account.id, ctx })} />
))}
```

  - after the History `TabsContent`:

```tsx
{pluginTabs.map(({ plugin, tab }) => (
  <TabsContent key={`${plugin.definition.id}:${tab.id}`} value={`plugin-${plugin.definition.id}-${tab.id}`}>
    <PluginSlot plugin={plugin} actor={actor} render={(ctx) => tab.component({ accountId, ctx })} />
  </TabsContent>
))}
```

  - imports: `requireAuthenticated` from `@/lib/authz`, `getTranslations` from `next-intl/server`, `getAccountTabs, getAccountPanels` from `@/lib/plugins/slots`, `PluginSlot` from `@/lib/plugins/ui/PluginSlot`.

With no plugins installed both arrays are empty and the page renders exactly as before.

- [ ] **Step 6: Plugin page route** `app/[locale]/(routes)/p/[pluginId]/[...path]/page.tsx`

```tsx
import { notFound, redirect } from "next/navigation";
import { requireAuthenticated, AuthenticationError } from "@/lib/authz";
import { findPluginPage } from "@/lib/plugins/slots";
import { PluginSlot } from "@/lib/plugins/ui/PluginSlot";

export default async function PluginPage(props: {
  params: Promise<{ pluginId: string; path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let user;
  try { user = await requireAuthenticated(); } catch (e) {
    if (e instanceof AuthenticationError) redirect("/sign-in");
    throw e;
  }
  const { pluginId, path } = await props.params;
  const searchParams = await props.searchParams;
  const found = await findPluginPage(pluginId, path, user.role);
  if (!found) notFound();
  return (
    <div className="p-4">
      <PluginSlot plugin={found.plugin} actor={{ type: "user", userId: user.id, role: user.role }}
        render={(ctx) => found.page.component({ path, searchParams, ctx })} />
    </div>
  );
}
```

- [ ] **Step 7: Typecheck, run tests, commit**

```bash
pnpm exec tsc --noEmit && pnpm exec jest lib/plugins
git add lib/plugins/slots.ts lib/plugins/ui/PluginSlot.tsx lib/plugins/__tests__/slots.test.ts "app/[locale]/(routes)/p" "app/[locale]/(routes)/crm/accounts/[accountId]/page.tsx"
git commit -m "feat(plugins): account tabs, panels and plugin pages"
```

---

### Task 12: Company registry provider in the account form

**Files:**
- Create: `actions/crm/accounts/lookup-company.ts`
- Modify: `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx`
- Test: `actions/crm/accounts/__tests__/lookup-company.test.ts`

**Interfaces:**
- Consumes: `getCompanyRegistryProviders`, `createPluginContext`, `requireAuthenticated`.
- Produces: `getRegistryCountries(): Promise<string[]>`; `lookupCompany(country: string, registrationNumber: string): Promise<{ data?: CompanyRecord; error?: string }>`.

- [ ] **Step 1: Write the failing test**

```ts
jest.mock("@/lib/authz", () => ({
  requireAuthenticated: jest.fn(async () => ({ id: "u1", role: "user" })),
  AuthenticationError: class AuthenticationError extends Error {},
}));
const lookup = jest.fn();
jest.mock("@/lib/plugins/slots", () => ({
  getCompanyRegistryProviders: jest.fn(async () => [{ plugin: { definition: { id: "registry-x" } }, provider: { countries: ["CZ", "SK"], lookup } }]),
}));
jest.mock("@/lib/plugins/context", () => ({ createPluginContext: jest.fn(async () => ({})) }));
jest.mock("next-intl/server", () => ({ getTranslations: jest.fn(async () => (k: string) => k) }));
import { getRegistryCountries, lookupCompany } from "@/actions/crm/accounts/lookup-company";

it("lists countries of enabled providers", async () => {
  expect(await getRegistryCountries()).toEqual(["CZ", "SK"]);
});

it("returns the provider result or a not-found error", async () => {
  lookup.mockResolvedValueOnce({ name: "Acme s.r.o.", registrationNumber: "12345678", country: "CZ" });
  await expect(lookupCompany("cz", " 12345678 ")).resolves.toEqual({ data: { name: "Acme s.r.o.", registrationNumber: "12345678", country: "CZ" } });
  expect(lookup).toHaveBeenCalledWith("12345678", "CZ", {});
  lookup.mockResolvedValueOnce(null);
  await expect(lookupCompany("CZ", "1")).resolves.toEqual({ error: "registryNotFound" });
  await expect(lookupCompany("DE", "1")).resolves.toEqual({ error: "registryNotFound" });
});
```

- [ ] **Step 2: Run — FAIL. Step 3: write `actions/crm/accounts/lookup-company.ts`**

```ts
"use server";
import { getTranslations } from "next-intl/server";
import type { CompanyRecord } from "@nextcrm/plugin-sdk";
import { requireAuthenticated } from "@/lib/authz";
import { getCompanyRegistryProviders } from "@/lib/plugins/slots";
import { createPluginContext } from "@/lib/plugins/context";

export async function getRegistryCountries(): Promise<string[]> {
  await requireAuthenticated();
  const all = (await getCompanyRegistryProviders()).flatMap((r) => r.provider.countries);
  return [...new Set(all)].sort();
}

export async function lookupCompany(country: string, registrationNumber: string): Promise<{ data?: CompanyRecord; error?: string }> {
  const user = await requireAuthenticated();
  const t = await getTranslations("Plugins");
  const cc = country.trim().toUpperCase();
  const found = (await getCompanyRegistryProviders()).find((r) => r.provider.countries.includes(cc));
  if (!found) return { error: t("registryNotFound") };
  const ctx = await createPluginContext({ plugin: found.plugin as never, actor: { type: "user", userId: user.id, role: user.role } });
  try {
    const data = await found.provider.lookup(registrationNumber.trim(), cc, ctx);
    return data ? { data } : { error: t("registryNotFound") };
  } catch (e) {
    ctx.log.error(`Registry lookup failed: ${String(e)}`);
    return { error: t("registryNotFound") };
  }
}
```

Run — PASS. (The test's `getTranslations` mock returns the key, hence `"registryNotFound"`.)

- [ ] **Step 4: Form button.** In `NewAccountForm.tsx`:
  - imports: `useState` (if not already), `getRegistryCountries, lookupCompany` from `@/actions/crm/accounts/lookup-company`, `useTranslations` already present.
  - inside the component:

```tsx
const p = useTranslations("Plugins");
const [registryCountries, setRegistryCountries] = useState<string[]>([]);
const [registryCountry, setRegistryCountry] = useState("");
const [lookingUp, setLookingUp] = useState(false);
useEffect(() => {
  getRegistryCountries().then((cs) => { setRegistryCountries(cs); setRegistryCountry(cs[0] ?? ""); }).catch(() => {});
}, []);
const loadFromRegistry = async () => {
  const number = form.getValues("company_id");
  if (!number || !registryCountry) return;
  setLookingUp(true);
  const res = await lookupCompany(registryCountry, number);
  setLookingUp(false);
  if (res.error || !res.data) { toast.error(res.error ?? p("registryNotFound")); return; }
  const d = res.data;
  form.setValue("name", d.name, { shouldValidate: true });
  form.setValue("company_id", d.registrationNumber);
  if (d.vat) form.setValue("vat", d.vat);
  if (d.street) form.setValue("billing_street", d.street);
  if (d.city) form.setValue("billing_city", d.city);
  if (d.postalCode) form.setValue("billing_postal_code", d.postalCode);
  form.setValue("billing_country", d.country);
};
```

  - directly after the `company_id` `FormField` (closing `/>`), add:

```tsx
{registryCountries.length > 0 && (
  <div className="flex items-center gap-2">
    <select aria-label="Registry country" className="border rounded-md h-9 px-2 bg-background" value={registryCountry}
      onChange={(e) => setRegistryCountry(e.target.value)}>
      {registryCountries.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
    <Button type="button" variant="outline" size="sm" disabled={lookingUp} onClick={loadFromRegistry}>
      {p("loadFromRegistry")}
    </Button>
  </div>
)}
```

With no provider installed `registryCountries` is empty and the form is unchanged.

- [ ] **Step 5: Typecheck, tests, commit**

```bash
pnpm exec tsc --noEmit && pnpm exec jest actions/crm/accounts
git add actions/crm/accounts/lookup-company.ts actions/crm/accounts/__tests__/lookup-company.test.ts "app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx"
git commit -m "feat(plugins): company registry provider button in the account form"
```

---

### Task 13: Testing harness, contract tests and authoring docs

**Files:**
- Create: `packages/plugin-sdk/src/testing.ts`, `__tests__/plugins/contract.test.ts`, `docs/plugins/README.md`
- Test: `packages/plugin-sdk/__tests__/testing.test.ts`

**Interfaces:**
- Produces: `createTestContext(opts?: { pluginId?; settings?; secrets?; actor?; data?: Partial<Record<"accounts"|"contacts"|"leads"|"opportunities"|"users"|"products"|"activities", RecordData[]>>; fetch?: (url, init) => Promise<Response> }): PluginContext & { logs: { level: string; message: string }[]; notifications: NotifyInput[] }`.

- [ ] **Step 1: Write the failing harness test** `packages/plugin-sdk/__tests__/testing.test.ts`

```ts
import { createTestContext } from "../src/testing";

it("provides in-memory data, store, logs and notifications", async () => {
  const ctx = createTestContext({ settings: { days: 90 }, data: { accounts: [{ id: "a1", company_id: "123" }] } });
  expect(ctx.settings).toEqual({ days: 90 });
  expect(await ctx.data.accounts.find({ where: { company_id: "123" } })).toEqual([{ id: "a1", company_id: "123" }]);
  const created = await ctx.data.accounts.create({ name: "N" });
  expect(await ctx.data.accounts.get(created.id as string)).toMatchObject({ name: "N" });
  await ctx.data.accounts.update("a1", { name: "X" });
  expect(await ctx.data.accounts.get("a1")).toMatchObject({ name: "X", company_id: "123" });
  await ctx.store.forRecord("account", "a1").set("until", "2027");
  expect(await ctx.store.forRecord("account", "a1").get("until")).toBe("2027");
  expect(await ctx.store.list()).toEqual([]);
  ctx.log.warn("w");
  await ctx.notify({ roles: ["manager"], subject: "s", text: "t" });
  expect(ctx.logs).toEqual([{ level: "warn", message: "w" }]);
  expect(ctx.notifications).toHaveLength(1);
  expect(ctx.t("a.b", { x: 1 })).toBe("a.b");
  await expect(ctx.http.fetch("https://x")).rejects.toThrow("No fetch mock configured");
});
```

- [ ] **Step 2: Run — FAIL. Step 3: write `packages/plugin-sdk/src/testing.ts`**

```ts
import type { Actor, EntityApi, FindArgs, NotifyInput, PluginContext, PluginStore, RecordData, RecordStore } from "./types";

type Tables = "accounts" | "contacts" | "leads" | "opportunities" | "users" | "products" | "activities";

function matches(row: RecordData, where?: RecordData) {
  return !where || Object.entries(where).every(([k, v]) => row[k] === v);
}

function table(rows: RecordData[]): EntityApi {
  let seq = 0;
  return {
    async get(id) { return rows.find((r) => r.id === id) ?? null; },
    async find(args: FindArgs = {}) {
      const out = rows.filter((r) => matches(r, args.where));
      return out.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? out.length));
    },
    async create(data) { const row = { id: `test-${++seq}`, ...data }; rows.push(row); return row; },
    async update(id, data) {
      const row = rows.find((r) => r.id === id);
      if (!row) throw new Error(`Not found: ${id}`);
      Object.assign(row, data);
      return row;
    },
  };
}

function memoryStore(map: Map<string, unknown>, scope: string): RecordStore {
  const k = (key: string) => `${scope}|${key}`;
  return {
    async get(key) { return (map.has(k(key)) ? map.get(k(key)) : null) as never; },
    async set(key, value) { map.set(k(key), JSON.parse(JSON.stringify(value))); },
    async delete(key) { map.delete(k(key)); },
    async list(prefix = "") {
      return [...map.entries()]
        .filter(([key]) => key.startsWith(`${scope}|${prefix}`))
        .map(([key, value]) => ({ key: key.slice(scope.length + 1), value }));
    },
  };
}

export function createTestContext(opts: {
  pluginId?: string;
  settings?: RecordData;
  secrets?: RecordData;
  actor?: Actor;
  data?: Partial<Record<Tables, RecordData[]>>;
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
} = {}): PluginContext & { logs: { level: string; message: string }[]; notifications: NotifyInput[] } {
  const d = opts.data ?? {};
  const map = new Map<string, unknown>();
  const logs: { level: string; message: string }[] = [];
  const notifications: NotifyInput[] = [];
  const log = (level: string) => (message: string) => { logs.push({ level, message }); };
  const store: PluginStore = { ...memoryStore(map, ""), forRecord: (entity, id) => memoryStore(map, `${entity}:${id}`) };
  return {
    plugin: { id: opts.pluginId ?? "test-plugin", version: "0.0.0" },
    actor: opts.actor ?? { type: "system" },
    locale: "en",
    settings: opts.settings ?? {},
    secrets: opts.secrets ?? {},
    data: {
      accounts: table(d.accounts ?? []),
      contacts: table(d.contacts ?? []),
      leads: table(d.leads ?? []),
      opportunities: table(d.opportunities ?? []),
      users: table(d.users ?? []),
      products: table(d.products ?? []),
      activities: { find: table(d.activities ?? []).find },
    },
    store,
    http: {
      fetch: async (url, init) => {
        if (!opts.fetch) throw new Error("No fetch mock configured");
        return opts.fetch(url, init);
      },
    },
    notify: async (input) => { notifications.push(input); },
    log: { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") },
    t: (key) => key,
    logs,
    notifications,
  };
}
```

Run — PASS.

- [ ] **Step 4: Contract test** `__tests__/plugins/contract.test.ts` — runs against every registered plugin (none yet; a fixture proves the checks work):

```ts
import { definePlugin, LOCALES, satisfiesSdkRange, z } from "@nextcrm/plugin-sdk";
import { getRegistry, type RegisteredPlugin } from "@/lib/plugins/registry";
import { describeSettingsSchema } from "@/lib/plugins/settings";

jest.mock("@/lib/email-crypto", () => ({ encrypt: (s: string) => s, decrypt: (s: string) => s }));

function keys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

export function contractProblems(p: RegisteredPlugin): string[] {
  const problems: string[] = [];
  const d = p.definition;
  if (!satisfiesSdkRange(d.sdk)) problems.push(`sdk ${d.sdk} not satisfied`);
  for (const [name, schema] of [["settings", d.settings], ["secrets", d.secrets]] as const) {
    try { describeSettingsSchema(schema); } catch (e) { problems.push(`${name}: ${(e as Error).message}`); }
  }
  const en = p.messages.en;
  if (!en) problems.push("messages/en.json missing");
  for (const loc of LOCALES) {
    const m = p.messages[loc];
    if (!m) { problems.push(`messages/${loc}.json missing`); continue; }
    const missing = keys(en).filter((k) => !keys(m).includes(k));
    if (missing.length) problems.push(`${loc} missing keys: ${missing.join(", ")}`);
  }
  const titles = [...d.extensions.accountTabs.map((t) => t.title), ...d.extensions.pages.map((pg) => pg.title)];
  for (const title of titles) if (en && !keys(en).includes(title)) problems.push(`en missing title key: ${title}`);
  return problems;
}

describe.each(getRegistry().map((p) => [p.definition.id, p] as const))("plugin %s", (_id, plugin) => {
  it("meets the plugin contract", () => expect(contractProblems(plugin)).toEqual([]));
});

it("contract catches broken plugins", () => {
  const broken: RegisteredPlugin = {
    source: "public",
    messages: { en: { tab: { title: "T" } }, cz: {} },
    definition: definePlugin({
      id: "broken", name: "B", version: "1.0.0", sdk: "^0.2.0", description: "", permissions: [],
      settings: z.object({ list: z.array(z.string()) }),
      extensions: (x) => x.accountTab({ id: "t", title: "tab.title", component: () => null }),
    }),
  };
  expect(contractProblems(broken)).toEqual([
    "sdk ^0.2.0 not satisfied",
    "settings: Unsupported settings field type: array (list)",
    "cz missing keys: tab.title",
    "messages/de.json missing",
    "messages/uk.json missing",
  ]);
});
```

Jest requires at least one test per file; the second `it` guarantees that while the registry is empty. `describe.each([])` with an empty table is allowed in Jest 30 only if wrapped — if Jest errors with "`.each` called with an empty Array of table data", replace it with `for (const p of getRegistry()) describe(...)`.

Run: `pnpm exec jest __tests__/plugins` — PASS.

- [ ] **Step 5: Authoring guide** `docs/plugins/README.md` — write these sections with the concrete content below:

```markdown
# Writing NextCRM plugins

Plugins are trusted code written by the NextCRM team. They ship in the product image and are installed per instance under Administration → Plugins.

## Layout
plugins/<id>/plugin.ts            default export of definePlugin(...)
plugins/<id>/messages/{en,cz,de,uk}.json
plugins/<id>/__tests__/*.test.ts  unit tests with createTestContext
Private, customer-specific plugins go to the private repository mounted at plugins-private/ (git submodule). Same structure.

After adding or removing a plugin run `pnpm plugins:generate --public-only` and commit lib/plugins/plugins.generated.ts. Our Docker build regenerates it including plugins-private/.

## Rules of the road
- Import only `@nextcrm/plugin-sdk`, files inside your plugin folder, `react`, `zod` and npm packages (add them to the root package.json). Boundaries are enforced by __tests__/plugins/boundaries.test.ts.
- No database tables. Keep state in ctx.store (JSON ≤ 256 KB per value); use ctx.store.forRecord(entity, id) for values attached to a CRM record. Everything in the store is deleted on uninstall.
- Settings and secrets are flat zod objects of string, number, boolean or enum fields (optional/default allowed). Required settings can be undefined until an admin saves them — check before use.
- Declare every permission you use. ctx.data, ctx.http and ctx.notify throw PluginPermissionError otherwise.
- Rules run inside the user's write and have 500 ms. Use onError: "block" only when skipping the rule would break a guarantee (e.g. ownership protection).
- Writes you make via ctx.data do not trigger your own rules; other plugins' rules still apply.
- ctx.http blocks private hosts unless the instance sets PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS=true. The host check and the request resolve DNS separately; this is acceptable for trusted plugins only.
- Account tabs, panels, pages and admin sections are React Server Components. Pass only plain props to client components.

## Extension points (SDK 0.1)
rule · after · on · cron · accountTab · accountPanel · page · adminSection · companyRegistry — see packages/plugin-sdk/src/types.ts and the spec docs/superpowers/specs/2026-10-04-plugin-system-design.md.

## Testing
Use createTestContext from @nextcrm/plugin-sdk/testing for unit tests. CI also runs the contract test (manifest, sdk range, settings schema, translations in all four locales).
```

- [ ] **Step 6: Commit**

```bash
git add packages/plugin-sdk/src/testing.ts packages/plugin-sdk/__tests__/testing.test.ts __tests__/plugins/contract.test.ts docs/plugins/README.md
git commit -m "feat(plugins): test harness, plugin contract tests and authoring guide"
```

---

### Task 14: End-to-end verification with a throwaway fixture plugin

**Files:**
- Create (temporary, not committed): `plugins/zz-fixture/plugin.tsx`, `plugins/zz-fixture/messages/{en,cz,de,uk}.json`

- [ ] **Step 1: Create the fixture**

`plugins/zz-fixture/plugin.tsx` (the generator accepts `plugin.ts` or `plugin.tsx`):
```tsx
import { definePlugin, allow, reject, z } from "@nextcrm/plugin-sdk";

export default definePlugin({
  id: "zz-fixture",
  name: "Fixture",
  version: "1.0.0",
  sdk: "^0.1.0",
  description: "Throwaway fixture for manual verification.",
  permissions: ["accounts:read", "accounts:write"],
  settings: z.object({ blockedName: z.string().default("BLOCKED") }),
  extensions: (x) => {
    x.rule("account", "beforeCreate", (input, ctx) =>
      input.data.name === ctx.settings.blockedName ? reject("err.blocked", { name: String(input.data.name) }) : allow(),
    );
    x.after("account", "created", async ({ recordId }, ctx) => { await ctx.store.forRecord("account", recordId).set("seen", true); });
    x.accountPanel({ id: "seen", component: async ({ accountId, ctx }) =>
      <p className="text-sm">Fixture: {String(await ctx.store.forRecord("account", accountId).get("seen"))}</p> });
    x.accountTab({ id: "tab", title: "tab.title", component: () => { throw new Error("fixture crash"); } });
  },
});
```

`messages/en.json`: `{ "tab": { "title": "Fixture" }, "err": { "blocked": "Name {name} is blocked by the fixture plugin." } }` — copy the same structure to `cz.json`, `de.json`, `uk.json`.

- [ ] **Step 2: Generate and run.** `node scripts/plugins/generate-registry.mjs --public-only && pnpm db:up && pnpm db:migrate && pnpm inngest:up && pnpm dev`

- [ ] **Step 3: Verify, as admin, in order** (each item is pass/fail):
  1. `/admin/plugins` lists "Fixture — Not installed".
  2. Detail page shows the `blockedName` field with default `BLOCKED` and permissions `accounts:read`, `accounts:write`; Install is disabled until the checkbox is ticked; install succeeds; status "Enabled".
  3. Create account "BLOCKED" via the UI → form shows "Name BLOCKED is blocked by the fixture plugin."; no account created.
  4. Same via MCP (`crm_create_account` with an API token) → tool error with code `RULE_REJECTED`.
  5. Create account "Acme" → succeeds; within a few seconds the account page shows the panel "Fixture: true" (after-action ran through Inngest).
  6. The "Fixture" tab shows "This plugin section is unavailable." and the plugin log on the admin page contains "UI render failed: Error: fixture crash"; the rest of the account page works.
  7. Change `blockedName` to `NOPE`, save → creating "BLOCKED" now succeeds (cache invalidated in-process).
  8. Disable → panel and tab disappear, creating "NOPE" succeeds.
  9. Uninstall → dialog shows "1 stored values on 1 records"; export link downloads JSON with the `seen` entry; after confirm, `select count(*) from "PluginData" where "pluginId"='zz-fixture'` returns 0 and account "Acme" still exists.
  10. Reinstall, then delete the fixture folder, regenerate, restart → `/admin/plugins` shows "zz-fixture — Missing from this version"; the account page renders; uninstall works.
  11. Restart with fixture version bumped to `1.1.0` while installed at `1.0.0` → `InstalledPlugin.version` becomes `1.1.0` after boot.

- [ ] **Step 4: Clean up.** Delete `plugins/zz-fixture/`, run `node scripts/plugins/generate-registry.mjs --public-only`, confirm `git status` shows no fixture files and the generated file has an empty array.

- [ ] **Step 5: Full CI locally**

```bash
pnpm exec tsc --noEmit
pnpm exec jest --ci --testPathIgnorePatterns "__tests__/invoices/lifecycle"
pnpm exec eslint lib/plugins packages/plugin-sdk plugins "app/[locale]/(routes)/admin/plugins" "app/[locale]/(routes)/p"
pnpm run build
```

All must pass. Record the results in the PR description.

- [ ] **Step 6: Open the PR** from the feature branch into `main` with title `feat: plugin system v0 (host + SDK)`, linking the spec and this plan, listing the verification checklist results from Step 3.
