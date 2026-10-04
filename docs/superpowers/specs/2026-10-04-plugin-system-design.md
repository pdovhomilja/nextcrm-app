# Plugin System (v0) — Design

Date: 2026-10-04 · Status: draft for review · Owner: Pavel Dovhomilja

## 1. Why

NextCRM is one global product deployed as one instance per company. Customers need behaviour the core should not carry: integrations with their ERP, country-specific registries, sales rules such as account ownership protection. Today the only way to add that is to change the core, which turns customer requests into local customizations of a global product.

A plugin system lets us ship that behaviour as separately installable units. A plugin can be installed, enabled, disabled and uninstalled per instance from the admin UI, without a rebuild, and without affecting instances that do not use it.

## 2. Decisions taken

| Question | Decision |
|---|---|
| Who writes plugins | Only the NextCRM team. Plugin code is trusted; permissions are guardrails, not a sandbox. |
| Distribution | All plugins ship inside the one product image. Installing = enabling on an instance at runtime. No runtime code loading. |
| Where plugins live | Public, generic plugins in `plugins/` of this repository. Customer-specific plugins in a private repository mounted at `plugins-private/` (git submodule) and included only in our own image builds. The public build works without it. |
| What a plugin can do | Data integrations (sync jobs, event handlers), its own screens and tabs, rules on save (validate, reject, modify). |
| What a plugin cannot do | Add its own database tables or columns, change core forms, import core internals. Plugin state lives in a platform-provided store (§ 8). |

## 3. Goals and non-goals

**Goals (v0)**
1. A typed SDK (`@nextcrm/plugin-sdk`) that is the only import surface for plugins.
2. Build-time discovery of plugins and a generated registry.
3. Per-instance lifecycle: install, enable, disable, uninstall, upgrade, with settings and encrypted secrets.
4. The extension points listed in § 6, and no more. New points are added when a plugin needs them.
5. A plugin failure never takes down the core.
6. Existing instances behave exactly as before when no plugin is installed.

**Non-goals (v0)**
- Third-party or untrusted plugins, sandboxing, a public marketplace, paid plugins.
- Runtime installation of code not present in the image.
- Plugin-defined database tables, custom fields in core forms.
- Navigation menu items, plugin MCP tools, slots on entities other than accounts. (Planned, § 13.)

## 4. Repository layout and build

```
packages/plugin-sdk/          # @nextcrm/plugin-sdk — public API for plugins
lib/plugins/                  # plugin host (core side): registry, lifecycle, runtime, rules
plugins/<id>/                 # public generic plugins
  plugin.ts                   #   manifest + extension registrations (default export)
  messages/{cz,en,de,uk}.json #   plugin translations
  ...                         #   plugin code
plugins-private/<id>/         # optional git submodule, same structure
lib/plugins/plugins.generated.ts  # generated, git-ignored
```

- `scripts/plugins/generate-registry.ts` scans `plugins/*/plugin.ts` and `plugins-private/*/plugin.ts` (if the folder exists) and writes `plugins.generated.ts` with static imports. It runs before `next build`, `next dev` and tests (`prebuild`, `predev`, `pretest` scripts).
- The Dockerfile copies `plugins-private/` when present; CI for the public repository builds without it.
- Boundaries are enforced by ESLint (`no-restricted-imports`):
  - core code (`app/`, `actions/`, `lib/` except `lib/plugins/`) must not import from `plugins/` or `plugins-private/`;
  - plugin code may import only `@nextcrm/plugin-sdk`, its own files, and npm dependencies; never `@/lib`, `@/actions`, `@/app` or another plugin.
- Plugin npm dependencies are declared in the root `package.json` (single lockfile). The manifest lists them for documentation.

## 5. Manifest

```ts
// plugins/account-protection/plugin.ts
import { definePlugin, z } from "@nextcrm/plugin-sdk";

export default definePlugin({
  id: "account-protection",          // kebab-case, unique, stable forever
  name: "Account protection",
  version: "1.0.0",                   // semver of the plugin
  sdk: "^0.1.0",                      // compatible SDK range
  description: "One owner per company registration number, with protection windows.",
  permissions: ["accounts:read", "accounts:write", "activities:read", "users:read", "notify"],
  settings: z.object({
    registrationWindowDays: z.number().int().min(1).default(90),
    contactProofDays: z.number().int().min(1).default(30),
    orderWindowMonths: z.number().int().min(1).default(12),
  }),
  secrets: z.object({}),              // encrypted settings, never returned to the browser
  extensions: (x) => {
    x.rule("account", "beforeCreate", checkRegistrationNumber, { onError: "block" });
    x.rule("account", "beforeUpdate", guardOwnerChange, { onError: "block" });
    x.cron("expire-protection", "0 6 * * *", expireProtection);
    x.accountTab({ id: "protection", title: "tab.title", component: ProtectionTab, roles: ["user", "manager", "admin"] });
    x.page({ path: "expiring", title: "page.expiring", component: ExpiringPage, roles: ["manager", "admin"] });
  },
  onInstall, onUpgrade, onUninstall,  // optional lifecycle hooks
});
```

- `permissions` are checked by `ctx.data` on every call (§ 8). A call outside the declared permissions throws `PluginPermissionError`.
- `settings` and `secrets` are zod schemas. The admin UI renders the form from them. Secrets are encrypted at rest with the existing `encrypt`/`decrypt` helpers in `lib/email-crypto.ts` (same key, called only from the plugin host).
- Translation keys are namespaced `plugins.<id>.*` and merged into next-intl messages at build time. A missing locale falls back to `en`.

## 6. Extension points (v0)

| Point | Registration | Host behaviour |
|---|---|---|
| Rule before write | `x.rule(entity, "beforeCreate" \| "beforeUpdate" \| "beforeDelete", fn, { onError, priority })` | Runs synchronously inside the write (§ 7). `fn` returns `allow()`, `reject(messageKey, params)` or `modify(patch)`. |
| Action after write | `x.after(entity, "created" \| "updated" \| "deleted", fn)` | Enqueued as Inngest event `plugin/<id>/after`; never delays the write. |
| Event handler | `x.on(eventName, fn)` | Subscribes to existing core Inngest events (`crm/account.saved`, `crm/opportunity.stage-changed`, …) plus new core events added in v0: `crm/account.deleted`, `crm/order.status-changed`. |
| Scheduled job | `x.cron(id, cronExpr, fn)` | Registered as an Inngest cron function `plugin/<id>/<jobId>`. |
| Account tab | `x.accountTab({ id, title, component, roles })` | Rendered as an extra tab on `crm/accounts/[accountId]`. React Server Component receiving `{ accountId, ctx }`. |
| Account side panel | `x.accountPanel({ id, component, roles })` | Small card in the account overview sidebar (e.g. "protected until"). |
| Plugin page | `x.page({ path, title, component, roles })` | Served at `/[locale]/p/<pluginId>/<path>`. No menu item in v0; linked from tabs, panels and notifications. |
| Admin page | automatic | `/admin/plugins/<pluginId>`: status, version, settings form, secrets form, log, uninstall. A plugin may add `x.adminSection(component)`. |
| Company registry provider | `x.companyRegistry({ countries, lookup, validateVat? })` | Core account form gets a "Load from registry" button when an enabled provider covers the account's country. |

Entities with rules and after-actions in v0: `account`, `contact`, `lead`, `opportunity`, `order`. (`order` arrives with the orders feature; the hook list is per model, so adding entities later is mechanical.)

All extensions of a plugin are inert while the plugin is not `ENABLED`: tabs and pages are not rendered, rules and handlers are skipped, Inngest functions return early with status `skipped:disabled`.

## 7. Rules on write

**Single interception point.** Writes to CRM models are spread across server actions, MCP tool handlers, imports and Inngest jobs. Rules are enforced in a Prisma Client extension (`prisma.$extends({ query: … })`) wrapped around the client in `lib/prisma.ts`, so every path through the shared client is covered.

- Intercepted operations per watched model: `create`, `createMany`, `update`, `updateMany`, `upsert`, `delete`, `deleteMany`. `*Many` operations run rules per affected row (the extension loads the rows first); bulk imports above 500 rows run rules in batches.
- Soft delete (`deletedAt` set via `update`) is reported to rules as `beforeDelete`.
- **Actor context** comes from `AsyncLocalStorage`: `runAsActor({ type: "user" | "token" | "plugin" | "system", userId, role, pluginId? }, fn)`. Server actions, the MCP route and Inngest functions set it at their entry point. A write without actor context runs as `system` and is logged once per call site in development.
- **Ordering:** rules of all enabled plugins for the operation run in `priority` order (default 100), then by plugin id. A `reject` stops the chain. `modify` patches are applied in order and later rules see the patched data.
- **Recursion:** writes made by a plugin through `ctx.data` run rules of *other* plugins but not of the writing plugin itself. Depth is capped at 3; deeper writes throw.
- **Timeouts and errors:** each rule has 500 ms. On timeout or exception the manifest's `onError` decides: `"block"` rejects the write with a generic "rule unavailable" message; `"allow"` (default) lets it through. Both are logged to the plugin log.
- **User-facing errors:** `reject` throws `PluginRuleError { pluginId, messageKey, params }`. Server actions map it to the standard form error; the MCP route returns it as a tool error with the translated message.
- **Known gaps (documented, not handled in v0):** raw SQL (`$queryRaw`, `$executeRaw`) and nested relation writes (`connectOrCreate`, nested `create` inside another model's write) bypass rules. v0 audits the codebase and converts nested writes to watched models into top-level writes; a lint rule flags new ones.

## 8. Plugin context (`ctx`)

Every plugin function receives `ctx`; it is the plugin's only access to the system.

| Member | Purpose |
|---|---|
| `ctx.plugin` | `{ id, version }` |
| `ctx.actor` | who triggered the call (user, token, system, plugin) |
| `ctx.settings` / `ctx.secrets` | parsed, typed settings; secrets decrypted server-side only |
| `ctx.data` | CRM read/write for entities in § 6 plus products, price lists, users (read). Goes through the same service functions and role scoping as the UI; checked against manifest permissions. Writes run as actor `plugin`. |
| `ctx.store` | plugin key/value store (below) |
| `ctx.http` | `fetch` with a 15 s default timeout, request logging (URL, status, duration; no bodies) and the existing SSRF host guard |
| `ctx.notify` | in-app notification and e-mail to users or roles |
| `ctx.log` | `debug/info/warn/error`, stored in `PluginLog` and shown on the admin page |
| `ctx.t` | translator for the plugin namespace |

**Store.** `ctx.store` offers `get/set/delete/list` for free keys and `forRecord(entity, id).get/set/delete` for values attached to a CRM record. Values are JSON, max 256 KB each. Typical uses: external IDs from an ERP, sync cursors, protection dates, ownership history. A plugin can only read its own store.

## 9. Data model (core)

```prisma
enum PluginStatus { ENABLED DISABLED }

model InstalledPlugin {
  id          String       @id            // plugin id
  version     String                      // version that ran onInstall/onUpgrade last
  status      PluginStatus @default(ENABLED)
  settings    Json         @default("{}")
  secrets     String?                     // encrypted JSON
  installedAt DateTime     @default(now())
  installedBy String?      @db.Uuid
  updatedAt   DateTime     @updatedAt
}

model PluginData {
  id         String   @id @default(uuid()) @db.Uuid
  pluginId   String
  entityType String   @default("")        // "" = free key
  entityId   String   @default("")
  key        String
  value      Json
  updatedAt  DateTime @updatedAt
  @@unique([pluginId, entityType, entityId, key])
  @@index([pluginId, key])
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

- An uninstalled plugin has no `InstalledPlugin` row.
- `PluginLog` keeps 30 days; a core cron deletes older rows.
- When a CRM record is hard-deleted, its `PluginData` rows are deleted by the same transaction (handled in the Prisma extension).
- Hosts with several app replicas read `InstalledPlugin` through a 10-second in-memory cache; enabling or disabling takes effect within 10 s everywhere.

## 10. Lifecycle

| Step | What happens |
|---|---|
| Available | Plugin is in the image; listed under Administration → Plugins with description, version and requested permissions. |
| Install (admin) | Check `sdk` range against the running SDK. Admin confirms permissions and fills required settings. Row created as `ENABLED`, then `onInstall(ctx)` runs (as an Inngest job if it may be long, e.g. first import). If `onInstall` fails the row is set to `DISABLED` with the error shown. |
| Disable / enable | Status flip. No data change. |
| Upgrade | On app start, if image version > row version: `onUpgrade(ctx, fromVersion)` runs once (guarded by a Postgres advisory lock), then `version` is updated. Failure → `DISABLED` + admin notification. |
| Uninstall (admin) | Admin sees a summary (number of store entries, records with attached data) and may download a JSON export. Then `onUninstall(ctx)`, delete `PluginData`, `PluginLog`, `InstalledPlugin`. Data written into core entities by the plugin (e.g. synced customers) stays; it is core data. |
| Removed from image | Row exists but code is missing: shown as "missing", all extensions inert, admin can uninstall (data deletion without `onUninstall`). |

Only `admin` can install, uninstall, change settings. Every lifecycle action writes to `crm_AuditLog` (entityType `plugin`).

## 11. Failure isolation and observability

- Tab, panel and page components render inside an error boundary; a crash shows "This plugin section is unavailable" and logs the error.
- Event handlers and cron jobs run in Inngest with retries (3) and are logged per plugin.
- `ctx.http` and rules have timeouts (§ 7, § 8).
- Admin page shows status, last 200 log lines, last run of each job, and error count over 24 h.

## 12. Testing

- **SDK harness** (`@nextcrm/plugin-sdk/testing`): `createTestContext({ settings, actor, data })` with in-memory `store`, `data` and `http` mocks, so plugin logic is unit-tested without the app.
- **Host tests:** registry generation, lifecycle transitions, permission checks, rule ordering, `onError` behaviour, recursion cap, actor propagation from server action, MCP route and Inngest.
- **Contract test per plugin** (run in CI for every plugin in `plugins/`): manifest validates, `sdk` range matches, translations exist for all four locales, no forbidden imports.
- **Regression:** full existing test suite passes with zero plugins installed; an instance upgraded with no plugins shows no behavioural change.

## 13. Roadmap after v0 (not in scope)

Navigation menu items; plugin MCP tools; tabs and panels on contacts, leads, opportunities, orders; outbound webhooks; scoped API tokens per plugin; plugin-defined custom fields shown in core forms.

## 14. First plugins (built on v0, separate specs)

- `account-protection` — one owner per company registration number (country + number), protection windows after registration and after each order, owner changes by managers only, channel-partner ownership from imported lists, daily expiry job, ownership history.
- `registry-ares` — company registry provider for CZ (ARES) and EU VAT validation (VIES).
- `odoo-connector` — sync of customers, products, price lists, sales orders, deliveries, invoices and payments from Odoo 17–19 (JSON-2 API, XML-RPC fallback); creates draft sales orders from NextCRM orders; billing mode end customer / via intermediary; price check against Odoo.

Price lists, the price-rule engine and orders are core features with their own spec; they are not plugins because every instance can use them.

## 15. Open questions

1. `packages/plugin-sdk` as a pnpm workspace package vs. a path alias (`@nextcrm/plugin-sdk` → `lib/plugins/sdk`). Workspace is cleaner for the boundary lint; alias is less build change. Decide in the implementation plan.
2. Whether plugin pages need their own layout slot in the main sidebar before v1 (depends on first plugins' UX feedback).
