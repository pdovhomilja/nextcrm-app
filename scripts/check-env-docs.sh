#!/usr/bin/env bash
#
# Env-doc guard (WS4).
#
# This fork has NO central env validator — every variable is read ad hoc from
# `process.env` at its point of use (see docs/reference/LESSONS_LEARNED.md:
# "A newly-required env var passes CI but breaks the Vercel deploy"). So the
# safety net is documentation parity, enforced here:
#
#   HARD GATE (non-zero exit on mismatch):
#     Every key declared in `.env.example` is documented in
#     docs/reference/ENVIRONMENT_VARIABLES.md (inside the <!-- env-doc:begin -->
#     … <!-- env-doc:end --> markers), and every key documented there exists in
#     `.env.example`. A deterministic name-set diff — it can only compare two
#     lists of key names, so it never false-fails on something ambiguous.
#
#   WARN (never fatal):
#     Any `process.env.X` read in application code whose X is NOT in
#     `.env.example` and NOT in the ignore-list below. Catches the fork's
#     specific failure mode: a new var used in code but never added to the
#     template (so the parity gate, which only knows .env.example, can't see it).
#
# Run locally (`bash scripts/check-env-docs.sh`) or in CI (guardrails.yml).
# POSIX-ish bash; deps: grep, sed, awk, comm, sort (all coreutils).

set -u
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

ENV_EXAMPLE=".env.example"
DOC="docs/reference/ENVIRONMENT_VARIABLES.md"

# Framework / CI / seed / test / E2B-sandbox-runtime / migration-script vars that
# are read from process.env but are deliberately NOT app config, so they do not
# belong in .env.example. Kept in sync with the "Not app config" appendix of the
# doc. Space-separated.
IGNORE="NODE_ENV CI VERCEL VERCEL_ENV VERCEL_URL VERCEL_GIT_COMMIT_SHA NEXT_RUNTIME \
SEED_DEMO_DATA SEED_CONTACT_EMAIL TEST_USER_EMAIL \
DATABASE_URL_MONGO DATABASE_URL_POSTGRES \
COMPANY_NAME COMPANY_WEBSITE TARGET_EMAIL TARGET_NAME KNOWN_DOMAIN"

red=''; yellow=''; green=''; reset=''
if [ -t 1 ]; then red=$'\033[31m'; yellow=$'\033[33m'; green=$'\033[32m'; reset=$'\033[0m'; fi
FAIL() { printf '  %sFAIL%s %s\n' "$red" "$reset" "$1"; }
WARN() { printf '  %sWARN%s %s\n' "$yellow" "$reset" "$1"; }
OK()   { printf '  %s ok %s %s\n' "$green" "$reset" "$1"; }

fail=0

[ -f "$ENV_EXAMPLE" ] || { FAIL "$ENV_EXAMPLE is missing"; exit 1; }
[ -f "$DOC" ]         || { FAIL "$DOC is missing"; exit 1; }

echo "Env-doc parity — .env.example <-> $DOC"

# 1. Keys declared in .env.example (uncommented `KEY=` lines only).
example_keys="$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$ENV_EXAMPLE" | sed -E 's/=.*//' | sort -u)"

# 2. Keys documented in the guarded region — table rows whose first cell is a
#    backticked name: `| \`KEY\` | … |`.
doc_region="$(awk '/<!-- env-doc:begin -->/{f=1;next} /<!-- env-doc:end -->/{f=0} f' "$DOC")"
doc_keys="$(printf '%s\n' "$doc_region" \
  | grep -oE '^\|[[:space:]]*`[A-Za-z_][A-Za-z0-9_]*`' \
  | grep -oE '[A-Za-z_][A-Za-z0-9_]*' | sort -u)"

if [ -z "$doc_keys" ]; then
  FAIL "no documented keys found between the <!-- env-doc:begin/end --> markers in $DOC"
  fail=1
fi

undocumented="$(comm -23 <(printf '%s\n' "$example_keys") <(printf '%s\n' "$doc_keys"))"
orphaned="$(comm -13 <(printf '%s\n' "$example_keys") <(printf '%s\n' "$doc_keys"))"

if [ -n "$undocumented" ]; then
  FAIL "in .env.example but NOT documented in $DOC:"
  printf '        %s\n' $undocumented
  fail=1
fi
if [ -n "$orphaned" ]; then
  FAIL "documented in $DOC but NOT in .env.example (orphaned / renamed?):"
  printf '        %s\n' $orphaned
  fail=1
fi
[ "$fail" -eq 0 ] && OK "every .env.example key is documented, and vice-versa"

# 3. Non-blocking scan: process.env reads not covered by .env.example.
echo ""
echo "Code scan — process.env reads missing from .env.example (warnings only):"
code_vars="$(grep -rhoE 'process\.env\.[A-Za-z_][A-Za-z0-9_]*' \
  app lib actions inngest components prisma 2>/dev/null \
  | sed -E 's/process\.env\.//' | sort -u)"

warned=0
# Flatten both lists to single space-delimited lines so the membership tests below
# match (example_keys is newline-separated; IGNORE may carry line-continuations).
example_flat=" $(echo $example_keys) "
ignore_flat=" $(echo $IGNORE) "
for v in $code_vars; do
  case "$example_flat" in *" $v "*) continue;; esac
  case "$ignore_flat" in *" $v "*) continue;; esac
  WARN "process.env.$v is read in code but not in .env.example (add it, or ignore-list it if it isn't app config)"
  warned=$((warned + 1))
done
[ "$warned" -eq 0 ] && OK "no un-templated process.env reads outside the ignore-list"

echo ""
if [ "$fail" -eq 0 ]; then
  printf 'Env-doc guard: %sPASS%s (%d warning(s))\n' "$green" "$reset" "$warned"
else
  printf 'Env-doc guard: %sFAIL%s — fix the parity mismatch above.\n' "$red" "$reset"
fi
exit "$fail"
