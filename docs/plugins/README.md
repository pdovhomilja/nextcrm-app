# Writing NextCRM plugins

Plugins are trusted code written by the NextCRM team. They ship in the product image and are installed per instance under Administration → Plugins.

## Layout

```
plugins/<id>/plugin.ts            default export of definePlugin(...)
plugins/<id>/messages/{en,cz,de,uk}.json
plugins/<id>/__tests__/*.test.ts  unit tests with createTestContext
```

Private, customer-specific plugins go to the private repository mounted at `plugins-private/` (git submodule). Same structure.

After adding or removing a plugin run `pnpm plugins:generate --public-only` and commit `lib/plugins/plugins.generated.ts`. Our Docker build regenerates it including `plugins-private/`.

## Rules of the road

- Import only `@nextcrm/plugin-sdk`, files inside your plugin folder, `react`, `zod` and npm packages (add them to the root package.json). Boundaries are enforced by `__tests__/plugins/boundaries.test.ts`.
- No database tables. Keep state in `ctx.store` (JSON ≤ 256 KB per value); use `ctx.store.forRecord(entity, id)` for values attached to a CRM record. Everything in the store is deleted on uninstall.
- Settings and secrets are flat zod objects of string, number, boolean or enum fields (optional/default allowed). Arrays and nested objects are rejected. Required settings can be undefined until an admin saves them, so check before use. If stored settings no longer match the schema after an upgrade, invalid fields fall back to schema defaults and a `warn` line is written to the plugin log.
- Declare every permission you use. `ctx.data`, `ctx.http` and `ctx.notify` throw `PluginPermissionError` otherwise.
- `ctx.data.users` is read-only and never exposes credentials (the password hash is always omitted).
- `ctx.data.<entity>.find()` filters (`where`, `orderBy`) may use only the model's own scalar fields plus `AND`/`OR`/`NOT`, never `password`. Relation filters throw `Invalid filter field: <key>`. `take` is capped at 100 rows.
- `crm/*.saved` events carry `source: <pluginId>` when the write came from a plugin's `ctx.data`, and a plugin's own `on` handlers skip events it caused.
- Rules run inside the user's write and have 500 ms. `onError` defaults to `"allow"`; use `"block"` only when skipping the rule would break a guarantee (e.g. ownership protection). A blocking rule that throws or times out rejects the write with the core "rule unavailable" message.
- Writes you make via `ctx.data` do not trigger your own rules; other plugins' rules still apply. Rule recursion depth is capped at 3.
- `ctx.http` times out after 15 s by default and blocks private hosts unless the instance sets `PLUGIN_HTTP_ALLOW_PRIVATE_HOSTS=true`. The host check and the request resolve DNS separately; this is acceptable for trusted plugins only. It follows up to 5 redirects, re-checking the host on each hop, and strips `Authorization`, `Cookie` and `Proxy-Authorization` on cross-origin hops. A caller-supplied `init.redirect` is ignored, and `timeoutMs` applies per hop.
- `onUpgrade` runs once per instance when the installed version is older than the code. Upgrades take a transaction-scoped Postgres advisory lock, so concurrent app instances do not run the same upgrade twice; keep `onUpgrade` idempotent. Boot upgrades run in the background, so new code (rules, crons, `on` handlers) may run against data `onUpgrade` has not migrated yet; handlers must tolerate un-migrated data.
- If a plugin's code is removed while its install row remains, the plugin shows as "missing" in admin and its extensions are inert; uninstalling deletes its data without calling `onUninstall`.
- Secrets are encrypted at rest and never sent to the browser; admin pages only see "is set" flags.
- Account tabs, panels, pages and admin sections are React Server Components. Pass only plain props to client components.
- Plugin messages live under `plugins.<id>.*` and fall back to `en`. Tab and page `title` values are message keys.

## Extension points (SDK 0.1)

`rule` · `after` · `on` · `cron` · `accountTab` · `accountPanel` · `page` · `adminSection` · `companyRegistry`. See `packages/plugin-sdk/src/types.ts` and the spec `docs/superpowers/specs/2026-10-04-plugin-system-design.md`.

## Testing

Use `createTestContext` from `@nextcrm/plugin-sdk/testing` for unit tests. It gives in-memory `ctx.data`, `ctx.store`, a mockable `ctx.http.fetch`, and records `ctx.logs` and `ctx.notifications`. `ctx.t` returns the key. CI also runs the contract test (`__tests__/plugins/contract.test.ts`): manifest, sdk range, settings schema, and translations in all four locales. It also fails on duplicate Inngest function ids (`plugin-<id>-cron-<slug>`, `plugin-<id>-on-<slug>`, `plugin-<id>-after`) and invalid cron expressions.
