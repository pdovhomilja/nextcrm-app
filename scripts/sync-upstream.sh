#!/usr/bin/env bash
#
# Tested upstream-sync lane.
#
# Pulls pdovhomilja/nextcrm-app into a throwaway `sync/upstream-<date>` branch on
# YOUR fork, so the merge is validated by CI + Guardrails in a PR BEFORE it can
# reach `main`. Merges happen HERE (on your workstation) — where conflicts are
# resolvable — never automatically in CI.
#
#   bash scripts/sync-upstream.sh              # merge upstream/main into a sync branch, stop before push
#   bash scripts/sync-upstream.sh --from upstream/dev   # sync from their bleeding-edge branch instead
#   bash scripts/sync-upstream.sh --push       # also push the branch and open the PR (asks gh)
#
# Default base is upstream/main (released/stable). Use --from upstream/dev only when
# you specifically want unreleased upstream work.
#
# Contributing BACK upstream is the mirror of this and does NOT use this script:
#   git fetch upstream
#   git switch -c fix/thing upstream/main     # branch off a CLEAN upstream base, not your customized main
#   ...isolated, upstream-worthy change only...
#   git push origin fix/thing
#   gh pr create --repo pdovhomilja/nextcrm-app --base main --head radesix:fix/thing

set -euo pipefail

UPSTREAM_URL="https://github.com/pdovhomilja/nextcrm-app.git"
BASE="upstream/main"
PUSH=0

while [ $# -gt 0 ]; do
  case "$1" in
    --from) BASE="$2"; shift 2 ;;
    --push) PUSH=1; shift ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

# Refuse to run on a dirty tree — a merge would tangle with uncommitted work.
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit or stash first." >&2
  exit 1
fi

echo "› Ensuring upstream remote…"
git remote add upstream "$UPSTREAM_URL" 2>/dev/null || git remote set-url upstream "$UPSTREAM_URL"

echo "› Fetching origin/main and $BASE…"
git fetch --quiet origin main
git fetch --quiet upstream "${BASE#upstream/}"

branch="sync/upstream-$(date +%Y%m%d-%H%M)"
echo "› Creating $branch from origin/main…"
git switch -c "$branch" origin/main

echo "› Merging $BASE…"
if git merge --no-ff --no-edit "$BASE"; then
  echo "✓ Merge is clean."
else
  cat >&2 <<'EOF'

✗ Merge has conflicts. Resolve them here on your workstation:
    git status                       # see conflicted files
    # ...edit, then...
    git add -A && git commit         # completes the merge
  Then re-run with --push, or push the branch and open a PR into main yourself.
  Do NOT resolve conflicts by discarding fork customizations — check CUSTOMIZATIONS.md.
EOF
  exit 1
fi

echo "› Running fork invariant guard on the merge result…"
bash scripts/check-invariants.sh || {
  echo "" >&2
  echo "✗ A fork invariant broke in the merge. The upstream change reverted one of your" >&2
  echo "  customizations — inspect the FAIL lines above and CUSTOMIZATIONS.md before pushing." >&2
  exit 1
}

echo ""
echo "Next: CI + Guardrails must validate this merge in a PR before it reaches main."
if [ "$PUSH" -eq 1 ]; then
  echo "› Pushing $branch and opening a PR…"
  git push -u origin "$branch"
  gh pr create --base main --head "$branch" \
    --title "chore: sync upstream ($BASE) into $branch" \
    --body "Automated upstream sync via scripts/sync-upstream.sh from \`$BASE\`. CI + Guardrails validate the merge before it reaches \`main\`. Review CUSTOMIZATIONS.md for anything to re-verify."
else
  cat <<EOF
› Not pushed (no --push). When ready:
    git push -u origin $branch
    gh pr create --base main --head $branch --title "chore: sync upstream into $branch"
EOF
fi
