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
| **Hosting** | Coolify (nixpacks) | **Vercel** (crm.radeengineering.com) | `vercel.json` *(WS3)* |
| **Environments** | `dev` → `main` | **3-tier:** feature → `main` → `qa` → `production` | migrate/promote workflows *(WS3)* |
| **Migrations** | Prisma `migrate deploy` | **Unchanged** — through CI only, never hand-applied, never `db push` | `check-invariants.sh`, `guardrails.yml` |
| **Package manager** | pnpm | **Unchanged** — pnpm | `check-invariants.sh` |
| **Unit tests** | Jest | **Unchanged** — Jest (kit's coverage discipline layered on) | — |
| **Ways of working** | — | starter-kit `CLAUDE.md`, `docs/guides/`, `.claude/skills/` ported | CODEOWNERS |
| **Coolify/nixpacks** | maintained | **Dormant** — left in place (not deleted) to avoid merge churn; unused on Vercel | — |

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
- Did a **schema change** land? Guardrails' drift check confirms a migration exists;
  confirm it applied to Supabase QA via `migrate-qa.yml` after merge.

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
