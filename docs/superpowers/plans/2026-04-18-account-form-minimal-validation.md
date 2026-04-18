# Account Form Minimal Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Relax client-side validation on `NewAccountForm` and `UpdateAccountForm` so only `name` is required; all other fields are optional but format-validated when filled.

**Architecture:** Pure client-side Zod schema changes in two React Hook Form components. No server action, Prisma, or Inngest changes. Pattern `.optional().or(z.literal(""))` fixes the RHF-empty-string issue.

**Tech Stack:** Next.js 15 App Router, React 19, React Hook Form, Zod, shadcn/ui, next-intl.

**Spec:** `docs/superpowers/specs/2026-04-18-account-form-minimal-validation-design.md`

---

## File Structure

**Files modified:**
- `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx` — Zod schema + `name` label required marker
- `app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx` — Zod schema + `name` label required marker

**Files NOT touched (confirmed already correct):**
- `actions/crm/accounts/create-account.ts` — server action already only requires `name`
- `actions/crm/accounts/update-account.ts` — server action already only requires `id`
- Inngest enrichment handlers — unchanged

**No tests:** No existing unit or E2E test coverage for these forms in the repo. Not adding test infra as part of this change (per spec "Non-Goals").

---

## Task 1: Relax NewAccountForm Zod schema

**Files:**
- Modify: `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx:40-64` (formSchema definition)

- [ ] **Step 1: Replace the `formSchema` block**

Find the existing block at lines 40-64:

```ts
const formSchema = z.object({
  name: z.string().min(1, t("nameRequired")).max(100),
  office_phone: z.string().optional(),
  website: z.string().optional(),
  fax: z.string().optional(),
  company_id: z.string().min(5).max(10),
  vat: z.string().max(20).optional(),
  email: z.string().email(t("emailInvalid")),
  billing_street: z.string().min(3).max(50),
  billing_postal_code: z.string().min(2).max(10),
  billing_city: z.string().min(3).max(50),
  billing_state: z.string().min(3).max(50).optional(),
  billing_country: z.string().min(3).max(50),
  shipping_street: z.string().optional(),
  shipping_postal_code: z.string().optional(),
  shipping_city: z.string().optional(),
  shipping_state: z.string().optional(),
  shipping_country: z.string().optional(),
  description: z.string().min(3).max(1000).optional(),
  assigned_to: z.string().min(3).max(50),
  status: z.string().min(3).max(50).optional(),
  annual_revenue: z.string().min(3).max(50).optional(),
  member_of: z.string().min(3).max(50).optional(),
  industry: z.string().min(3).max(50),
});
```

Replace with:

```ts
const formSchema = z.object({
  name: z.string().min(1, t("nameRequired")).max(100),
  office_phone: z.string().max(50).optional(),
  website: z.string().url(t("websiteInvalid")).optional().or(z.literal("")),
  fax: z.string().max(50).optional(),
  company_id: z.string().max(20).optional(),
  vat: z.string().max(20).optional(),
  email: z.string().email(t("emailInvalid")).optional().or(z.literal("")),
  billing_street: z.string().max(100).optional(),
  billing_postal_code: z.string().max(20).optional(),
  billing_city: z.string().max(100).optional(),
  billing_state: z.string().max(100).optional(),
  billing_country: z.string().max(100).optional(),
  shipping_street: z.string().max(100).optional(),
  shipping_postal_code: z.string().max(20).optional(),
  shipping_city: z.string().max(100).optional(),
  shipping_state: z.string().max(100).optional(),
  shipping_country: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  assigned_to: z.string().optional(),
  status: z.string().optional(),
  annual_revenue: z.string().optional(),
  member_of: z.string().max(100).optional(),
  industry: z.string().optional(),
});
```

- [ ] **Step 2: Mark `name` label as required**

Find the `name` FormField (around line 94) and update the FormLabel to include a required asterisk:

```tsx
<FormLabel>
  {t("accountName")} <span className="text-destructive">*</span>
</FormLabel>
```

- [ ] **Step 3: Type-check**

Run from project root:

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && pnpm tsc --noEmit
```

Expected: No new type errors introduced by the change. If `t("websiteInvalid")` triggers a missing-message-key warning, proceed to Step 4; otherwise skip.

- [ ] **Step 4: Add `websiteInvalid` i18n key if missing**

Check if the translation key exists:

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && grep -n "websiteInvalid" messages/*.json
```

If not present, add it to both `messages/en.json` and `messages/cs.json` inside the `CrmAccountForm` namespace. Example:

```json
"CrmAccountForm": {
  ...
  "websiteInvalid": "Website must be a valid URL"
}
```

Czech translation: `"websiteInvalid": "Webová stránka musí být platná URL"`

Alternative if adding i18n keys feels out of scope for this change: inline the literal string instead, e.g. `z.string().url("Website must be a valid URL")`. Pick one and be consistent.

- [ ] **Step 5: Manual smoke test — minimal create**

Start dev server, navigate to `/crm/accounts`, open "New Account" form. Fill ONLY `name = "Test Co"`, submit.

Expected: Account is created, toast shows success, form resets.

- [ ] **Step 6: Manual smoke test — invalid email blocks submit**

Open "New Account" form. Fill `name = "Test Co 2"`, `email = "notanemail"`. Submit.

Expected: Email field shows the validation error; submit does not proceed. Clear the email field (empty) → submit now proceeds.

- [ ] **Step 7: Commit**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && git add app/[locale]/\(routes\)/crm/accounts/components/NewAccountForm.tsx messages/ && git commit -m "refactor(crm): relax NewAccountForm validation to require only name"
```

---

## Task 2: Relax UpdateAccountForm Zod schema

**Files:**
- Modify: `app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx` (formSchema definition)

- [ ] **Step 1: Read current schema**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && grep -n "formSchema\|z.object\|z.string" "app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx" | head -40
```

Note the exact line range of the `formSchema = z.object({ ... })` block.

- [ ] **Step 2: Replace formSchema with relaxed version**

Replace the `formSchema` block with this exact definition (same shape as NewAccountForm for consistency):

```ts
const formSchema = z.object({
  name: z.string().min(1, t("nameRequired")).max(100),
  office_phone: z.string().max(50).optional().nullable(),
  website: z.string().url(t("websiteInvalid")).optional().nullable().or(z.literal("")),
  fax: z.string().max(50).optional().nullable(),
  company_id: z.string().max(20).optional().nullable(),
  vat: z.string().max(20).optional().nullable(),
  email: z.string().email(t("emailInvalid")).optional().nullable().or(z.literal("")),
  billing_street: z.string().max(100).optional().nullable(),
  billing_postal_code: z.string().max(20).optional().nullable(),
  billing_city: z.string().max(100).optional().nullable(),
  billing_state: z.string().max(100).optional().nullable(),
  billing_country: z.string().max(100).optional().nullable(),
  shipping_street: z.string().max(100).optional().nullable(),
  shipping_postal_code: z.string().max(20).optional().nullable(),
  shipping_city: z.string().max(100).optional().nullable(),
  shipping_state: z.string().max(100).optional().nullable(),
  shipping_country: z.string().max(100).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  assigned_to: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  annual_revenue: z.string().optional().nullable(),
  member_of: z.string().max(100).optional().nullable(),
  industry: z.string().optional().nullable(),
});
```

Note: `.nullable()` is added because `UpdateAccountForm` receives existing account data where fields may be `null` in the database. This allows defaultValues from DB nulls to pass validation without coercion.

- [ ] **Step 3: Mark `name` label as required**

Find the `name` FormField in UpdateAccountForm and update the FormLabel:

```tsx
<FormLabel>
  {t("accountName")} <span className="text-destructive">*</span>
</FormLabel>
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && pnpm tsc --noEmit
```

Expected: No new type errors. If the `updateAccount` action argument type conflicts with `null` values, handle by coercing `null` to `undefined` at submit time:

```ts
const onSubmit = async (data: FormValues) => {
  const payload = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === null ? undefined : v])
  );
  const result = await updateAccount({ id, ...payload });
  ...
};
```

Only add this coercion if Step 4 surfaces a type error; otherwise leave onSubmit untouched.

- [ ] **Step 5: Manual smoke test — clearing optional field saves**

Open an existing account's edit form. Clear a previously-filled optional field (e.g., `website` or `billing_street`). Submit.

Expected: Save succeeds, toast shows success, cleared field persists as empty/null in DB.

- [ ] **Step 6: Manual smoke test — invalid email blocks save**

Edit an existing account. Set `email = "broken"`. Submit.

Expected: Email validation error shown; save blocked. Clear email → submit succeeds.

- [ ] **Step 7: Commit**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && git add "app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx" && git commit -m "refactor(crm): relax UpdateAccountForm validation to require only name"
```

---

## Task 3: Verify enrichment pipeline unchanged

**Files:** None modified — verification only.

- [ ] **Step 1: Confirm Inngest event still fires**

Check the existing server actions still dispatch the enrichment event:

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && grep -n "crm/account.saved" actions/crm/accounts/
```

Expected output includes both `create-account.ts` and `update-account.ts` sending `crm/account.saved`.

- [ ] **Step 2: Manual enrichment verification**

Create a minimal account (Task 1 Step 5 already did this). Observe the Inngest dashboard or logs for a `crm/account.saved` event firing with the new account's `record_id`.

If enrichment is expected to populate fields (e.g., fill in billing address from company_id lookup), verify one enriched field appears on the account detail page after a few seconds.

Expected: event fires; enrichment behavior unchanged from before this refactor.

- [ ] **Step 3: No commit**

Task 3 is verification only — nothing to commit.

---

## Task 4: Final verification and PR prep

- [ ] **Step 1: Run build to catch any remaining type/lint issues**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && pnpm lint && pnpm tsc --noEmit
```

Expected: No new errors compared to the pre-change state. Any pre-existing warnings unrelated to these files can be ignored.

- [ ] **Step 2: Review diff**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && git log --oneline dev..HEAD && git diff dev..HEAD --stat
```

Expected: Two or three commits touching only the two form files (and optionally `messages/*.json`).

- [ ] **Step 3: Push and open PR against `dev`**

```bash
cd /Users/pdovhomilja/development/Next.js/nextcrm-app && git push -u origin HEAD
```

Then create PR using `gh pr create --base dev --title "refactor(crm): minimal validation on account create/edit forms" --body "..."`. Per user preference, PR target is `dev`, not `main`.

PR body should include:
- Link to spec: `docs/superpowers/specs/2026-04-18-account-form-minimal-validation-design.md`
- Summary: only `name` is required; other fields validate format when filled; enrichment unchanged.
- Test plan checklist covering the manual smoke tests from Tasks 1 and 2.

---

## Self-Review Results

**Spec coverage:**
- NewAccountForm schema relax → Task 1 ✓
- UpdateAccountForm schema relax → Task 2 ✓
- `name` visual required marker → Tasks 1 & 2 Step 2/3 ✓
- Server actions untouched → confirmed in File Structure ✓
- Enrichment untouched → Task 3 verifies ✓
- Manual test matrix from spec → Tasks 1 & 2 smoke tests ✓

**Placeholder scan:** No TBDs, no "add appropriate X". Conditional steps (e.g., Task 1 Step 4, Task 2 Step 4) include explicit fallback instructions.

**Type consistency:** Both schemas use identical field names and consistent patterns. `.nullable()` added only to UpdateAccountForm because it loads existing DB rows that may contain nulls.
