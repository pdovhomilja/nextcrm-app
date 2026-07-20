# Proposed reply — GHSA-mg5f-m89f-4gmc

Thank you for the detailed and well-written report, including the PoC and impact analysis. We were able to confirm the BOLA/IDOR you described.

**Status: Fixed.**

The root cause was exactly as you identified: the `PATCH` handlers for `app/api/crm/contacts/[id]/route.ts` and `app/api/crm/targets/[id]/route.ts` only verified session existence and then called `prismadb.*.update({ where: { id } })` with no ownership/tenant predicate, allowing any authenticated user to overwrite another user's records.

### Remediation

This has been remediated in commit `c80d3ec` and is part of a broader authorization hardening effort:

1. **Object-level authorization is now enforced at the data layer.** A centralized `lib/authz` module was introduced. Both endpoints now call `requireAuthenticated()` and then `tryScopedUpdateContact()` / `tryScopedUpdateTarget()`.

2. **The update is scoped by ownership** via `updateMany` with a role-aware `where` clause:
   - `member`/user role — contacts: `{ id, OR: [{ assigned_to: user.id }, { createdBy: user.id }] }`; targets: `{ id, created_by: user.id }`
   - `admin`/`manager` — unrestricted by `id` (intended privileged behavior)
   - When `result.count === 0`, the endpoint returns a combined not-found/forbidden response so resource existence is not leaked to an unauthorized caller.

3. **Mass-assignment hardening.** Incoming fields are filtered through an explicit allow-list (`FIELD_MAP`) before reaching the database.

4. **Regression coverage** was added under `lib/authz/__tests__/` (`scopes-crm.test.ts`, `scopes-crm-enrichment.test.ts`, `route.test.ts`) to prevent recurrence.

With these changes, the supplied PoC returns a 403/404 with no mutation instead of `200 OK`.

### Affected / patched versions

- **Affected:** `<= 0.11.1`
- **Patched:** `0.12.0` (released 2026-05-08) and later, including `0.12.1`.

We recommend all users upgrade to `>= 0.12.0`.

Thanks again for the responsible disclosure. We'd be glad to credit you in the advisory — please let us know the name/handle you'd like used.
