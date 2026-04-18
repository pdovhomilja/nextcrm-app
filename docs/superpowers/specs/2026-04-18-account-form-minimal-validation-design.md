# Account Form — Minimal Validation Refactor

**Date:** 2026-04-18
**Scope:** `nextcrm-app` — CRM Accounts module
**Status:** Design approved

## Problem

The "Create new Account" form at `/crm/accounts` currently enforces strict client-side validation on many fields (`company_id`, `email`, billing address block, `assigned_to`, `industry`, etc.). This creates friction because:

1. Accounts are enriched automatically after creation via the `crm/account.saved` Inngest event, so most fields do not need to be collected upfront.
2. The current Zod schema contains a bug pattern: fields declared `.min(3).optional()` still reject empty strings submitted by React Hook Form, making "optional" fields effectively required.
3. The server action `createAccount` already accepts all fields as optional except `name`, so the client is the only blocker.

`UpdateAccountForm` shares the same schema shape and has the same issues.

## Goal

Require only `name` on both `NewAccountForm` and `UpdateAccountForm`. Keep all existing fields visible and in place — users who want to enter details can still do so, and enrichment fills the rest.

## Non-Goals

- Changing enrichment logic (Inngest handler stays as-is).
- Redesigning form layout or field ordering.
- Adding a minimal/expanded toggle.
- Adding unit or E2E tests for these forms (no existing test coverage to extend).
- Touching other CRM modules (Contacts, Opportunities, etc.).

## Design

### Validation rules

| Field | Rule |
|---|---|
| `name` | Required. `min(1).max(100)`. |
| `email` | Optional. If provided, must be a valid email. Empty string allowed. |
| `website` | Optional. If provided, must be a valid URL. Empty string allowed. |
| `office_phone`, `fax` | Optional. `max(50)`. |
| `company_id`, `vat` | Optional. `max(20)`. |
| `billing_*`, `shipping_*` | Optional. `max(100)` (or `max(20)` for postal codes). |
| `description` | Optional. `max(1000)`. |
| `assigned_to`, `status`, `annual_revenue`, `industry` | Optional. No min length. |
| `member_of` | Optional. `max(100)`. |

### Zod pattern

For fields that need format validation when present but must also accept empty strings from React Hook Form inputs:

```ts
email: z.string().email(t("emailInvalid")).optional().or(z.literal("")),
website: z.string().url().optional().or(z.literal("")),
```

For plain optional text fields without format rules, use `.max(N).optional()` alone. Do NOT use `.min(N).optional()` — it rejects empty strings.

### UI changes

- `NewAccountForm.tsx`: update the Zod schema per the table above. Visually mark only the `name` label as required (e.g., append `*`). All other labels lose any required-looking styling.
- `UpdateAccountForm.tsx`: apply the same schema relaxation. The form already has existing values so the practical behavior change is primarily about not blocking saves when a user clears a previously-filled field.
- No layout, field-order, or grid changes.
- Submit button behavior unchanged.

### Server actions

- `actions/crm/accounts/create-account.ts` — already correct. No change.
- `actions/crm/accounts/update-account.ts` — already correct (only `id` required). No change.

### Enrichment

`inngest.send({ name: "crm/account.saved", ... })` already fires after create and update. Enrichment pipeline is untouched.

## Implementation Checklist

1. Update `formSchema` in `app/[locale]/(routes)/crm/accounts/components/NewAccountForm.tsx`.
2. Update required label marker on `name` field only.
3. Update `formSchema` in `app/[locale]/(routes)/crm/accounts/components/UpdateAccountForm.tsx` to match.
4. Update required label marker on `name` field only in UpdateAccountForm.
5. Manual verification:
   - Create account with `name` only → succeeds.
   - Create account with `name` + invalid email → email format error shown, form blocks submit.
   - Create account with all fields filled → succeeds.
   - Update account clearing previously-filled optional fields → succeeds.
   - Enrichment (`crm/account.saved`) still fires post-save.

## Risks

- **Low:** Users may submit accounts with very little data. This is the intended behavior — enrichment fills gaps.
- **Low:** Any downstream code that assumes `email` / `billing_*` are present on newly created accounts would break. The Prisma schema already permits null for these fields (server action accepts them as optional), so this is an existing assumption, not a new one introduced here.

## Out-of-Scope Follow-ups (not this spec)

- Review other CRM forms (Contacts, Opportunities, Leads) for the same over-validation pattern.
- Consider adding a minimal/expanded toggle (design option C) if users find the full form visually overwhelming.
