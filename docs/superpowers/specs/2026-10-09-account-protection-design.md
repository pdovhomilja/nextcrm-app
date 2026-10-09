# account-protection plugin — design

Date: 2026-10-09. Status: approved in chat by Pavel (three sections), awaiting review of this document.
Parent spec: `docs/superpowers/specs/2026-10-04-plugin-system-design.md` (§ 14 lists `account-protection` as a first plugin).
Origin: OXO implementation plan v1.2, § 8.1 (claudeOS `staging/oxofactory/2026-10-04-oxo-crm-nextcrm-implementacni-plan-v1.2.md`). The values in brackets there (90 / 30 days) are instance settings here.

## 1. Goal

A public, generic plugin that gives each company one owner. A company is identified by country + registration number. A new owner gets a protection window. Protection lapses when the owner documents no contact in time, and only managers can move an account to another owner, with every move recorded.

Success, on an instance with the plugin enabled:
- a user cannot create a second account for a registration number that another account already holds, through the form, MCP or a job;
- the user sees only "Protected until <date>" (or "already in the CRM"), never the owner or the customer's data, and managers are told;
- a protected account without a qualifying contact by the deadline, or past the protection window, loses its owner in the next daily run, and managers get the list;
- only managers and admins can change an account's owner, and every change is in the account's history.

### 1.1 In scope (v1)

Rules 1, 2, 5, 6, 7 (without partner import) and 8 of OXO § 8.1, plus the core and SDK additions in § 3.

### 1.2 Not in v1

- **Rule 3, orders** ("12 months from the last order"). Core has no orders. Orders get their own core spec next (price lists, lines, numbering, statuses, Odoo source). Rule 3 then becomes a small follow-up to this plugin (§ 8).
- **Rule 4, channel-partner lists.** There is no partner entity and no plugin write path for uploading a list.
- **Leads.** `crm_Leads` has no registration-number field, so rules apply to accounts only.
- **"Sample" as its own activity type.** An instance records a sample as a visit, or adds the type later.

## 2. Terms

- **Number key:** `<CC>:<number>`.
  - `CC` is an ISO 3166-1 alpha-2 code taken from `billing_country`. It accepts a code ("CZ") or a country name in en/cz/de/uk ("Czechia", "Česko", "Tschechien", "Чехія"), mapped through `Intl.DisplayNames`. If `billing_country` is empty or unrecognised, the `defaultCountry` setting is used.
  - `number` is `company_id` with whitespace removed and upper-cased. For `CC = CZ`, it is left-padded with zeros to 8 digits.
  - An account with an empty `company_id` has no key and is **unprotected**.
- **Registration:** the protection record of one account with an owner. A registration is created when an account with a key gets an owner: when a user creates it, or when a manager assigns it.
- **Qualifying contact:** an activity that is linked to the account, has `status = completed`, has a `type` listed in the `contactTypes` setting, and has a `date` on or after the registration date.
- **Protected until:** `registeredAt + protectionDays`. Before the contact deadline (`registeredAt + contactDays`), the registration lapses at the deadline unless a qualifying contact exists.

## 3. Core and SDK additions

All of these are generic. None of them contains protection logic.

1. **Activity type `visit`.**
   - Migration: add `visit` to the `crm_Activity_Type` enum.
   - Add it to the activity form, with labels in `locales/{en,cz,de,uk}.json`.
   - Existing rows are unchanged.
2. **`ctx.data.activities.findForRecord(entity, id, { types?, status?, since?, take?, skip? })`.**
   - Read-only. It returns activities linked to the record through `crm_ActivityLinks`, newest first, with the same 100-row cap as `find`.
   - Add it to the SDK type (`packages/plugin-sdk/src/types.ts`) and to the testing context.
3. **Actor and changed fields in after hooks.**
   - The `plugin/<id>/after` event payload gains `actor: { type, userId?, role? }`.
   - For updates it also gains `changed: string[]`: the field names in the update's `data` whose value differs from `existing`.
   - Existing plugins ignore the new keys.
4. **Plugin pages in the menu.**
   - `page({ ..., nav?: { label, icon } })` adds a sidebar item under "Plugins". It is visible only to the page's `roles` and only while the plugin is ENABLED.
   - The label is a key in the plugin's messages.
   - This is already described in the plugin-system spec but was not built.

Paging needs no change: `find` already takes `take` and `skip` (at most 100 per call).

## 4. Plugin `plugins/account-protection`

```
plugins/account-protection/plugin.ts        definition, rules, hooks, crons, slots
plugins/account-protection/key.ts           number key normalisation
plugins/account-protection/state.ts         registration maths (pure, clock passed in)
plugins/account-protection/store.ts         typed wrappers over ctx.store keys
plugins/account-protection/rules.ts         beforeCreate / beforeUpdate handlers
plugins/account-protection/hooks.ts         after-hook handlers
plugins/account-protection/jobs.ts          daily expiry, notice sender, install backfill
plugins/account-protection/ui/*.tsx         tab, panel, Expiring page, admin section
plugins/account-protection/messages/{en,cz,de,uk}.json
plugins/account-protection/__tests__/*.test.ts
```

Definition: id `account-protection`, permissions `["notify"]`.

### 4.1 Settings

| key | type | default |
|---|---|---|
| `protectionDays` | number | 90 |
| `contactDays` | number | 30 |
| `contactTypes` | string, comma-separated activity types | `visit,meeting` |
| `warnDays` | number | 7 |
| `defaultCountry` | string, ISO alpha-2 | `CZ` |
| `requireNumber` | boolean | false |

Validation: `contactDays ≤ protectionDays`, both ≥ 1, and `contactTypes` only lists existing types.

### 4.2 Storage (`ctx.store`, global scope)

| key | value |
|---|---|
| `num:<CC>:<number>` | `{ accountId }` |
| `reg:<accountId>` | `{ key, ownerId, registeredAt, contactDeadline, protectedUntil, contactAt? }` |
| `due:<YYYY-MM-DD>:<accountId>` | `{}`. The date is the earlier of the contact deadline (until contact is found) and protected-until. |
| `hist:<accountId>:<ISO timestamp>` | `{ from, to, byUserId?, byType, reason }`, where `reason` is `created`, `assigned`, `released`, `expired-no-contact`, `expired` or `install` |
| `freed:<YYYY-MM-DD>:<accountId>` | `{ reason }`, written when the expiry job frees an account; entries older than 7 days are deleted by the same job |
| `notice:<ISO timestamp>:<rand>` | `{ kind: "blocked-protected" \| "blocked-free", userId, accountId }` |
| `conflict:<accountId>` | `{ key, otherAccountId, foundAt }` |

History is kept until uninstall. Uninstalling deletes all plugin data (platform behaviour), and core accounts keep their current owners.

### 4.3 Rules (all `onError: "block"`)

**`account.beforeCreate`**
1. Compute the key. With no key: if `requireNumber` is on and the actor is a user or token with role `user`, reject `numberRequired`. Otherwise allow.
2. Look up `num:<key>`. If it is missing, allow.
3. If it is present:
   - when the existing account has a `reg:` entry and the creator is not its owner, reject `protected` with `{ until }`;
   - otherwise reject `alreadyInCrm`.
   
   In both cases, write a `notice:` entry (`blocked-protected` or `blocked-free`), unless the creator is the existing account's owner.

   The same rejection applies to managers and admins (one account per number), and they can see the existing account anyway.

**`account.beforeUpdate`**
1. If `company_id` or `billing_country` changes the key to one held by another account, reject as in beforeCreate.
2. If `assigned_to` changes and the actor is a `user`/`token` with role `user`, reject `ownerManagersOnly`. System and plugin actors, and managers and admins, are allowed.

Each rule does one or two store reads and stays well inside the 500 ms budget. Neither rule sends email.

### 4.4 After hooks

- `account.created`: if there is a key, write `num:`.
  - If `num:` already pointed elsewhere (a race), write `conflict:` instead.
  - If the account has an owner, start a registration: write `reg:`, `due:` and `hist:` with reason `created`.
- `account.updated` with `changed` including `assigned_to`:
  - write `hist:` (from the previous `reg:` owner, to the new owner, by the actor), with reason `assigned` or `released`;
  - clear the old `reg:` and `due:`;
  - if there is a new owner and a key, start a new registration.
- `account.updated` with `changed` including `company_id`/`billing_country`: move `num:` to the new key.
- `account.deleted` (including soft delete): remove `num:`, `reg:` and `due:`. Keep `hist:`.

### 4.5 Cron jobs

- **`expire`, daily at 06:00 (server time).** For each `due:` key with a date up to today:
  - read `reg:`;
  - if the contact deadline is reached and no contact is recorded, check with `findForRecord`. On a qualifying contact, set `contactAt`, move `due:` to protected-until, and continue;
  - otherwise set the account's `assigned_to` to null (via `ctx.data.accounts.update`, plugin actor), write `hist:` with `expired-no-contact` or `expired` and a `freed:` entry, and delete `reg:` and `due:`.
  
  Then send one email to all managers listing the freed accounts. No email if the list is empty.
- **`notices`, every 5 minutes.** Send each queued `notice:` to managers (account name, rep name, kind), then delete it.

### 4.6 Install (`onInstall`)

- Page through all non-deleted accounts, 100 per call.
- Build `num:` (on a duplicate key the oldest `createdAt` wins, and the others go to `conflict:`).
- For accounts with an owner and a key, write `reg:` dated on the install day plus `hist:` with reason `install`.
- An instance with about 10 000 accounts means about 100 reads. This runs in the install job, not in a request.

### 4.7 Screens (all text in en/cz/de/uk)

- **Account tab "Protection"** (all roles):
  - status (protected / not protected and why);
  - protected until;
  - contact deadline, and whether it's met (live via `findForRecord`);
  - owner history. A `user` sees history only for accounts they can already open, so core read scope applies.
- **Account panel** (all roles): one line, "Protected until 12 Jan 2027", "Contact needed by 3 Nov 2026" or "Not protected: no registration number".
- **Page `expiring`** (manager and admin, in the menu): registrations due within `warnDays` (read from `due:` by date prefix), plus accounts freed in the last 7 days (read from `freed:`).
- **Admin section:** the conflicts list (both accounts, the shared key). Settings use the platform's settings form.

## 5. Error handling

- Rule timeout or exception: the write is blocked with the platform's generic "rule unavailable" message (`onError: block`). The error goes to the plugin log.
- A store write failing in an after hook: the hook throws, and Inngest retries it (3×). The state is rebuilt from the account on retry, because every hook handler is idempotent.
- The expiry job processes each account independently. One failing account is logged and left in place for the next run.
- A notice email failing to send: the `notice:` entry stays and is retried on the next run. After 24 h it is dropped and logged.

## 6. Testing

- Unit tests:
  - `key.ts`: codes, names in four languages, CZ padding, empty input;
  - `state.ts`: windows, deadlines and edge days, with a fixed clock.
- Rule tests with every actor type and role: duplicate protected, duplicate free, own re-create, no number with and without `requireNumber`, owner change by user, manager, plugin and system.
- Hook tests: created, owner change, number change, delete, race to conflict.
- Job tests with a fixed clock: contact found just in time, no contact, expired, an empty run sends no email, notices sent and deleted.
- Install test: duplicates resolved oldest-first.
- Core tests for § 3: the `visit` enum, `findForRecord`, the after payload, and nav items shown by role and plugin state.
- A manual check on local dev with a local Inngest server, the same way as registry-ares.

## 7. Risks

- **Race between two creates** with the same number in the same instant: both can pass the before-rule. The after hook records a `conflict:` for a manager to resolve. A unique constraint in core would prevent it, but it would put protection logic in core.
- **Owner changes made while the plugin is disabled** are not in the history. The next owner change or registration starts fresh from the current owner.
- **Country from free text:** an unrecognised `billing_country` falls back to `defaultCountry`, which can merge two foreign companies with the same number. The admin conflicts list shows such cases.

## 8. Follow-ups

- **Rule 3** once core orders exist: an `order` after hook or a `crm/order.status-changed` event extends `protectedUntil` to `lastOrderAt + orderMonths` (a new setting).
- **Rule 4:** a partner entity or list, plus a plugin write path for the upload.
- **Leads:** a registration-number field in core, then the same rules on `lead`.
