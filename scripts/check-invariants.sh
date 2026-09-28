#!/usr/bin/env bash
#
# Fork invariant guard.
#
# Asserts that the customizations that make this a Rade Engineering fork (rather
# than a stock pdovhomilja/nextcrm-app checkout) are still in place. Its main job
# is to fail LOUDLY after an upstream merge silently reverts or overrides one of
# them — the kind of breakage that otherwise ships to a hosted environment before
# anyone notices.
#
# Two severities:
#   FAIL  — a hard invariant that is true TODAY and upstream could break. Non-zero exit.
#   WARN  — an invariant that only becomes enforceable once a later workstream
#           (WS3: Vercel + promote workflows) lands. Reported, never fatal, until
#           promoted to FAIL here.
#
# Run locally (`bash scripts/check-invariants.sh`) or in CI (guardrails.yml).
# POSIX-ish bash; no external deps beyond grep.

set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

fail=0
warn=0
red=''; yellow=''; green=''; reset=''
if [ -t 1 ]; then red=$'\033[31m'; yellow=$'\033[33m'; green=$'\033[32m'; reset=$'\033[0m'; fi

FAIL() { printf '  %sFAIL%s %s\n' "$red" "$reset" "$1"; fail=$((fail + 1)); }
WARN() { printf '  %sWARN%s %s\n' "$yellow" "$reset" "$1"; warn=$((warn + 1)); }
OK()   { printf '  %s ok %s %s\n' "$green" "$reset" "$1"; }

echo "Fork invariants — hard checks (upstream must not break these):"

# 1. Package manager stays pnpm (upstream is pnpm; a bad merge to npm/yarn breaks CI + Coolify/Vercel).
if grep -q '"packageManager"[[:space:]]*:[[:space:]]*"pnpm@' package.json; then
  OK "packageManager is pnpm"
else
  FAIL "packageManager is no longer pnpm in package.json"
fi

# 2. No 'prisma db push' anywhere in scripts — dev-push is banned (drifts schema, leaves CI nothing to apply).
#    Exclude the guard scripts themselves, which name the banned pattern on purpose.
if grep -rInE 'prisma[[:space:]]+db[[:space:]]+push' package.json scripts \
     --exclude=check-invariants.sh --exclude=sync-upstream.sh >/dev/null 2>&1; then
  FAIL "'prisma db push' found (dev-push is banned; generate a migration instead)"
else
  OK "no 'prisma db push' in package.json / scripts"
fi

# 3. No UNCOMMENTED 'runtime = edge' in app/ — Vercel Fluid Compute (Node.js) is the default; edge is deprecated here.
#    The leading [^/]* excludes commented lines like `//export const runtime = "edge"`.
if grep -rInE "^[[:space:]]*[^/[:space:]].*runtime[[:space:]]*[:=][[:space:]]*['\"]edge['\"]" app >/dev/null 2>&1; then
  FAIL "an active 'runtime = edge' export exists under app/ (prefer default Node.js runtime on Vercel)"
else
  OK "no active edge-runtime export under app/"
fi

# 4. Prisma is still the migration engine (a committed migrations dir must exist).
if [ -d prisma/migrations ] && ls prisma/migrations/*/migration.sql >/dev/null 2>&1; then
  OK "prisma/migrations present (Prisma remains the migration engine)"
else
  FAIL "prisma/migrations is missing or empty"
fi

echo ""
echo "Fork invariants — 3-tier deploy model (WS3):"

# 5. vercel.json disables main auto-deploy (the 3-tier promote model).
if [ -f vercel.json ]; then
  if grep -q '"main"[[:space:]]*:[[:space:]]*false' vercel.json; then
    OK "vercel.json disables main auto-deploy"
  else
    FAIL "vercel.json exists but no longer disables main auto-deploy"
  fi
else
  FAIL "vercel.json is missing — main auto-deploy is no longer disabled"
fi

# 6. The 3-tier branch-advance / promote workflows exist.
#    (NextCRM's build migrates on deploy, so there are no separate migrate-* jobs.)
for wf in advance-qa.yml promote-production.yml; do
  if [ -f ".github/workflows/$wf" ]; then
    OK ".github/workflows/$wf present"
  else
    FAIL ".github/workflows/$wf is missing (3-tier deploy automation)"
  fi
done

echo ""
printf 'Summary: %s%d FAIL%s, %s%d WARN%s\n' \
  "$([ "$fail" -gt 0 ] && echo "$red" || echo "$green")" "$fail" "$reset" \
  "$([ "$warn" -gt 0 ] && echo "$yellow" || echo "$green")" "$warn" "$reset"

[ "$fail" -eq 0 ]
