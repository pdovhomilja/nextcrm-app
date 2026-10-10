# Odoo connector, part 1: connection and customers — design

Date: 2026-10-10. Status: approved in chat by Pavel (three sections), awaiting review of this document.
Parent spec: `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (plugins), OXO implementation plan v1.2 § 8.3–8.4 (claudeOS `staging/oxofactory/2026-10-04-oxo-crm-nextcrm-implementacni-plan-v1.2.md`), milestone M1 (13 Nov 2026).
This is part 1 of 3 (Pavel, 2026-10-10): **1) connection + customers in** (this spec), 2) catalog in (products, price lists, "compare with Odoo"), 3) orders (out on READY; statuses, deliveries, invoices, payments back; billing modes; Odoo tab). Order history import waits for part 3, because order lines need the products from part 2.

## 1. Goal

An instance that runs its sales in an Odoo ERP gets its customers into the CRM and keeps them current: Odoo customers become accounts, their people become contacts, and later edits in Odoo arrive within the sync interval.

Success:
- after install, every Odoo customer (company or individual, `customer_rank > 0`) is an account in the CRM, matched to an existing account where one exists, never duplicated;
- the account's owner is the Odoo salesperson's CRM user (same email); accounts without one are listed for managers;
- a change in Odoo to a synced field arrives within `syncMinutes` (default 15);
- the CRM's own data (owner after import, shipping address, price list, notes, activities) is never overwritten;
- nothing is written to Odoo.

Generic product rules apply: nothing specific to OXO or GIPS in code; all text in en, cz, de, uk.

### 1.1 Decisions (Pavel, 2026-10-10)

1. Three specs by data flow; this is part 1.
2. **Owner:** the partner's Odoo salesperson (`user_id`), mapped by email to an active CRM user; no match → no owner and the "Needs owner" list. A sync never changes an existing account's owner.
3. **Conflicts:** Odoo wins for the synced fields (§ 3.4); everything else belongs to the CRM.
4. **Partners:** customers (companies and individuals) become accounts; their child people (type `contact`) become contacts.
5. **Sync by polling** (`write_date` cursor), no Odoo-side automation: the Odoo side only grants access (OXO plan § 8.4).

### 1.2 Not in scope

- Writing to Odoo (partners are created there in part 3, when an order needs one).
- Products, price lists, orders, deliveries, invoices, payments (parts 2 and 3).
- Delivery and invoice address children of a partner (part 3 decides how shipping addresses map).
- Suppliers (`supplier_rank` only) and archived customers on the first import.

## 2. Plugin `plugins/odoo-connector`

```
plugins/odoo-connector/plugin.ts      definition: settings, secrets, crons, slots, install
plugins/odoo-connector/settings.ts    zod settings and secrets
plugins/odoo-connector/odoo.ts        JSON-2 client (search_read, read, version), retries
plugins/odoo-connector/map.ts         partner → account / contact fields (pure)
plugins/odoo-connector/match.ts       matching and number normalisation (pure)
plugins/odoo-connector/sync.ts        first import, incremental run, cursor, conflicts, counts
plugins/odoo-connector/store.ts       typed wrappers over ctx.store keys
plugins/odoo-connector/ui/*.tsx       admin section, Needs-owner page, account panel
plugins/odoo-connector/messages/{en,cz,de,uk}.json
plugins/odoo-connector/__tests__/*.test.ts
```

Definition: id `odoo-connector`, SDK `^0.2.1`, permissions `http`, `accounts:read`, `accounts:write`, `contacts:read`, `contacts:write`, `users:read`, `notify`.

### 2.1 Settings and secrets

| key | type | default | notes |
|---|---|---|---|
| `url` | string, https URL | — | Odoo base URL, e.g. `https://odoo.example.com` |
| `database` | string | — | sent as `X-Odoo-Database` |
| `syncMinutes` | integer 5–1440 | 15 | the cron runs every 5 minutes and syncs when this much time has passed since the last run |
| `defaultCountry` | ISO alpha-2 | `CZ` | for partners without a country |
| `dryRun` | boolean | true | log what would be created or updated, write nothing |

Secret: `apiKey` (encrypted by the platform). `dryRun` defaults to on, so the first run on a new instance is a rehearsal.

## 3. Behaviour

### 3.1 Odoo client

- JSON-2 API: `POST {url}/json/2/{model}/{method}` with `Authorization: bearer {apiKey}`, `X-Odoo-Database: {database}`, JSON body of keyword arguments. Only `search_read`, `read` and `res.users/context_get` (connection test) are called in part 1.
- Through `ctx.http.fetch` (host re-checked per redirect, credentials never sent cross-origin, private hosts refused unless the instance allows them).
- Timeout 30 s. Network errors and 5xx: 3 attempts with 2 s, 4 s backoff. 401: no retry; the run stops and logs "Odoo rejected the API key". 403: no retry; the run stops and logs "Odoo denied access: <Odoo's message>" (final review). Other 4xx: no retry; logged with Odoo's error message.
- The client sits behind an interface (`OdooClient`), so an XML-RPC implementation can replace it if an Odoo host blocks JSON-2 (risk § 6).

### 3.2 What comes in

- **Customers:** `res.partner` with `customer_rank > 0`, `parent_id = false`, `active = true`; companies (`is_company`) and individuals.
- **People:** `res.partner` with `parent_id` in the synced customers and `type = 'contact'`, `active = true`.
- Fields read: `id, name, is_company, company_registry, vat, street, street2, city, zip, state_id, country_id, email, phone, mobile, function, user_id, parent_id, type, active, write_date`; for `user_id`, the user's `login`/email.

### 3.3 Runs

- **First import** (`onInstall`, and by the cron whenever no cursor exists yet — the platform has no enable hook, so a plugin installed with `dryRun` on, or with a wrong key, imports on its first good run): customers page by page (100 per call, ordered by `id`), then people; the cursor is set to the newest `write_date` seen.
- **Incremental** (cron every 5 minutes, runs when `syncMinutes` have passed): partners matching § 3.2 *or* now archived/no longer customers, with `write_date > cursor − 2 minutes`, ordered by `write_date, id`, 100 per page. Then the partners Odoo did not change but the CRM still owes: unlinked active customers (conflicts, failed creates), partners whose last sync failed (`retry:<id>`), and the people of customers linked in this run. The cursor moves only when the whole run succeeds; a failed run is repeated from the old cursor (final review). Re-processing a partner is idempotent.
- **Sync now:** an admin button that runs the incremental job immediately.
- **Run lock:** a store key with an expiry (10 minutes, renewed after each page) prevents overlapping runs. In dry run the scheduled sync is paused; only Sync now runs (final review).

### 3.4 Matching and fields (customers → accounts)

Links are stored both ways (`partner:<odooId>` → accountId, `account:<accountId>` → odooId).

1. Linked → that account.
2. Same country + registration number → link. Normalisation: whitespace removed, upper-cased; for `CZ`, left-padded to 8 digits (the same rule as account-protection's number key, implemented in this plugin).
3. Same VAT (`vat`, whitespace removed, upper-cased) → link.
4. Otherwise → create the account.

Two or more accounts matching in step 2 or 3 → no link, a `conflict:<odooId>` entry (partner, candidate accounts, reason) for the admin list, and the partner is skipped until resolved (an admin links it by editing one of the accounts so only one matches, or deletes the duplicate).

Synced fields (Odoo wins), written only when the Odoo value differs from the account's; an empty Odoo value never clears a filled CRM value (Pavel, 2026-10-10):

| Odoo | Account |
|---|---|
| `name` | `name` |
| `company_registry` | `company_id` |
| `vat` | `vat` |
| `street` + `street2` | `billing_street` |
| `city`, `zip` | `billing_city`, `billing_postal_code` |
| `state_id` name | `billing_state` |
| `country_id` code (or `defaultCountry`) | `billing_country` |
| `email` | `email` |
| `phone` (else `mobile`) | `office_phone` |

Never touched by a sync: owner (`assigned_to`, except on create), shipping address, price list, website, notes, activities, and every other field.

**Owner on create:** the Odoo salesperson's email matched case-insensitively to an `ACTIVE` CRM user; no salesperson or no match → no owner, and the account is listed on "Needs owner" (with the Odoo salesperson's name if any) until it has an owner.

### 3.5 People → contacts

Matched by link (`contact:<odooId>`), then by email among the account's contacts, otherwise created on the linked account. Fields: `name` split into first name (all but the last word) and last name (the last word; a one-word name becomes the last name), `email`, `phone` → `office_phone`, `mobile` → `mobile_phone`, `function` → `position`. A person whose customer has no linked account (conflict) waits.

### 3.6 Archived, deleted, no longer a customer

The link stays; nothing in the CRM is deleted or changed. The account's panel shows "archived in Odoo" (or "no longer a customer in Odoo"). A partner reactivated in Odoo syncs normally again.

### 3.7 With account-protection

Creates and updates go through `ctx.data.accounts`, so other plugins' rules apply. Matching by registration number first means the importer does not create a second account for a known number. A rule rejection (`PluginRuleError`) is logged with the partner and skipped; the run continues.

### 3.8 Logging and alerts

- One info line per run: created / updated / unchanged / skipped / conflicts, and duration.
- One error line per partner that failed, with the partner id.
- Three consecutive failed runs → one email to admins ("Odoo sync is failing: <last error>"); the next successful run resets the count.
- `dryRun`: every would-be create or update is an info line with the field changes; nothing is written and the cursor does not move.

## 4. Screens (all text in en, cz, de, uk)

- **Admin section** (Admin → Plugins → Odoo connector):
  - "Test connection" → Odoo version and the API user's name, or the error;
  - "Sync now";
  - last run (time, counts, status), next run, dry-run indicator;
  - conflicts list (partner name and id, candidate accounts with links, reason).
- **"Needs owner" page** (managers and admins, plugin nav item): imported accounts without an owner, with the Odoo salesperson's name; each row links to the account.
- **Odoo panel** on linked accounts: "Linked to Odoo partner #<id>" (link to `{url}/odoo/contacts/<id>`), last synced time, the synced fields list, and the archived / no-longer-customer notice.
- **Docs:** `apps/docs/content/docs/admins/plugins/odoo-connector.mdx` (install, Odoo user and API key, settings, dry run, conflicts, Needs owner) and a line in the plugins index.

## 5. Testing

- **Pure:** field mapping (company, individual, street2, missing country, state name, phone vs mobile), name split, registration-number normalisation, matching order (link, number, VAT, conflict on two candidates), owner by email (case, inactive users), "changed fields only".
- **Sync with a fake Odoo** (mocked `ctx.http.fetch` serving JSON-2 responses from fixtures):
  - first import of 3 customers (2 companies, 1 individual) and 2 people, one customer matching an existing account by number, one by VAT;
  - incremental: rename, address change, archive, reactivation; unchanged partner does nothing;
  - cursor with overlap; a failed page stops and the next run resumes; idempotent re-run;
  - 401 stops the run with the right log line; 5xx retried then succeeds; three failed runs email admins once;
  - dry run writes nothing and does not move the cursor;
  - account-protection rejection is logged and skipped;
  - run lock prevents overlap.
- **Live check (read-only, Pavel's consent):** dry run against the GIPS Odoo with the technical user's key (or Pavel's existing read key), comparing the customer count with the OXO plan facts (80 customers, 75 with a registration number or VAT), then a real run on a local instance.

## 6. Risks

- **Data quality:** of 80 GIPS customers, 75 have a registration number or VAT; about 5 are created without a match key. The log and the account list show them.
- **JSON-2 availability:** new in Odoo 18/19; if a host blocks it, an XML-RPC client implements the same `OdooClient` interface.
- **Email mismatch:** owners come from salesperson emails; reps' CRM emails must match their Odoo logins.
- **Volume:** the first import of a large Odoo (tens of thousands of partners) runs for minutes inside the install job; GIPS has about 217 partners.
- **Clock skew** between Odoo and the CRM is covered by the 2-minute cursor overlap.
