# Proposed reply — GHSA-gm7p-f88p-vhfr

Thank you for the clear report and working PoC. We confirmed the Broken Access Control you described in the `activateUser` / `deactivateUser` Server Actions.

**Status: Fixed.**

The root cause was as you identified: `actions/admin/users/activate-user.ts` and `actions/admin/users/deactivate-user.ts` only checked for session existence and never enforced the `admin` role, so any authenticated user could activate/deactivate arbitrary accounts (including the administrator).

### Remediation

Remediated in commit `8215af2`, as part of the broader `lib/authz` authorization hardening:

1. **Role enforcement at the top of each action.** Both Server Actions now call `await requireRole(["admin"])` before any database mutation. A non-admin caller receives `{ error: "Forbidden" }` and no state change occurs; an unauthenticated caller receives `{ error: "Unauthorized" }`.

2. **Role is resolved from the database, not the session.** `requireRole()` → `requireAuthenticated()` looks up the user's `role` via `prismadb.users.findUnique` using the session user id. The privilege decision therefore cannot be bypassed by tampering with the session token or client payload.

3. **Consistent failure mode.** Authorization failures throw a typed `AuthorizationError` / `AuthenticationError` that the action maps to safe error responses without performing the update.

With these changes, the supplied PoC no longer deactivates the admin account — the action returns `Forbidden` and `userStatus` is unchanged.

### Affected / patched versions

- **Affected:** `<= 0.11.1`
- **Patched:** `0.12.0` (released 2026-05-08) and later, including `0.12.1`.

We recommend all users upgrade to `>= 0.12.0`.

Thanks again for the responsible disclosure. We'd be glad to credit you in the advisory — please let us know the name/handle you'd like used.
