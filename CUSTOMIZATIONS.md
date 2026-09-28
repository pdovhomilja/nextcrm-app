# Fork Customizations

This repo is a fork of [`pdovhomilja/nextcrm-app`](https://github.com/pdovhomilja/nextcrm-app),
adapted into the **Rade Engineering CRM**. This file is the living manifest of every
way this fork deliberately diverges from upstream — so that after an upstream merge you
know exactly what to re-verify, and so the automated guards (`scripts/check-invariants.sh`,
`.github/workflows/guardrails.yml`) have a documented reason for each check.

**Keep this current.** When you make a new fork-specific change, add a row.

---

## Divergences from upstream

| Area | Upstream | This fork | Enforced by |
|---|---|---|---|
| **Database host** | Local Postgres / self-managed | **Supabase Postgres** (QA + prod); local for DEV | connection strings (env) |
| **ORM / auth** | Prisma + better-auth | **Unchanged** — Supabase is DB-host-only (no Supabase Auth, no RLS) | — |
| **Local DEV DB** | Docker Postgres `:5433` (`pnpm db:up`) | **Hybrid** — canonical DEV DB is the Supabase CLI stack (`supabase start`, `:54622`) for hosted parity; `:5433` compose kept **untouched** as fallback. `db:*` scripts + `assert-local-db.sh` deliberately NOT repointed (avoids churning upstream `package.json`); the host guard already allows `127.0.0.1:54622`. Ports pinned to the `546xx` block in `supabase/config.toml` to coexist with other local Supabase stacks. `supabase/` dir is additive. | — |
| **Local object storage** | MinIO via `docker-compose.dev.yml` | **SeaweedFS** — MinIO's public Docker images were gated in 2025, so the compose file's local S3 is SeaweedFS (`:9000`) + a one-shot `createbucket`. `lib/minio.ts` (generic path-style S3) is unchanged; R2 still used on QA/prod. One edit to `docker-compose.dev.yml` + additive `docker/seaweedfs-s3-config.json`. | — |
| **Auth — first user & dev OTP** | better-auth email-OTP | **Additive:** first user auto-promoted to admin+`ACTIVE` via `databaseHooks.user.create.after` → `lib/auth-hooks.ts`; and in non-prod the OTP is logged to the server console (`lib/auth.ts`) so local login needs no inbox. Both are dev/bootstrap conveniences; no upstream auth behavior removed. | — |
| **Hosting** | Coolify (nixpacks) | **Vercel** (crm.radeengineering.com) | `vercel.json` *(WS3)* |
| **Environments** | `dev` → `main` | **3-tier:** feature → `main` → `qa` → `production` | `advance-qa.yml` + `promote-production.yml` |
| **Deploy / migration** | build runs `prisma migrate deploy` (Coolify) | **Build-migrates on Vercel** — the deploy migrates its own DB; `advance-qa`/`promote-production` only move branch pointers. Vercel builds **only** `qa`/`production` (Ignored Build Step) so PR previews never migrate QA. `main` deploy off (`vercel.json`). | `check-invariants.sh`, CODEOWNERS |
| **Migrations** | Prisma `migrate deploy` | **Unchanged** — through CI only, never hand-applied, never `db push` | `check-invariants.sh`, `guardrails.yml` |
| **Package manager** | pnpm | **Unchanged** — pnpm | `check-invariants.sh` |
| **Unit tests** | Jest | **Unchanged** — Jest (kit's coverage discipline layered on) | — |
| **Ways of working** | — | starter-kit `CLAUDE.md`, `docs/guides/`, `.claude/skills/` ported | CODEOWNERS |
| **Coolify/nixpacks** | maintained | **Dormant** — left in place (not deleted) to avoid merge churn; unused on Vercel | — |
| **CI cost** | `ci.yml` runs E2E on every push (~8 min) | **Path-gated** — a `changes` job gates `integration`/`build`/`e2e` on `if: needs.changes.outputs.code == 'true'`; docs/CI/agent-config-only pushes skip them and run just `fast` + guardrails. One edit to upstream's `ci.yml`. | `CODEOWNERS` |

*(WS3)* = lands in the CI/CD workstream; its invariant is a WARN in `check-invariants.sh`
until then, promoted to FAIL once the file exists.

---

## Keeping up with upstream (sync IN)

Never merge upstream straight into `main`. Use the tested lane:

```bash
bash scripts/sync-upstream.sh          # merge upstream/main into sync/upstream-<date>, run guards
bash scripts/sync-upstream.sh --push   # also push + open the PR
```

The PR runs full **CI + Guardrails** before the merge can reach `main`. A weekly
[`upstream-drift`](.github/workflows/upstream-drift.yml) job opens a tracking issue when
the fork falls behind.

**After a sync merge, re-verify the judgment calls the scripts can't check:**
- Did upstream add a **new required env var**? It must be added to every Vercel scope
  (Development/Preview/Production) or the Vercel deploy breaks while CI stays green.
- Did upstream add a **Coolify/self-host assumption** that conflicts with Vercel?
- Did upstream touch **auth** in a way that assumes their better-auth config vs ours?
- Did a **schema change** land? Guardrails' schema/migration-sync check confirms a
  migration accompanies it; confirm it applied to Supabase QA via `migrate-qa.yml` after merge.

## Contributing BACK upstream (sync OUT)

You do **not** need a `dev` branch in this fork. Cut the contribution branch from a
**clean upstream base**, not from this customized `main`:

```bash
git fetch upstream
git switch -c fix/thing upstream/main    # clean base (or upstream/dev if they direct you)
# ...isolated, upstream-worthy change only — not entangled with fork customizations...
git push origin fix/thing
gh pr create --repo pdovhomilja/nextcrm-app --base main --head radesix:fix/thing
```

If a change is entangled with fork customizations, extract just the upstream-relevant
part onto the clean base before opening the PR.
