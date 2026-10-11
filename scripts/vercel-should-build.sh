#!/usr/bin/env bash
# Vercel Ignored Build Step: exit 0 = skip deploy, exit 1 = run full build.
# See vercel.json → ignoreCommand

set -euo pipefail

if ! git rev-parse HEAD^ >/dev/null 2>&1; then
  exit 1
fi

mapfile -t changed < <(git diff --name-only HEAD^ HEAD)

if ((${#changed[@]} == 0)); then
  exit 1
fi

should_skip() {
  local f="$1"
  case "$f" in
    *.md|*.MD|*.txt) return 0 ;;
    docs/*|apps/docs/*) return 0 ;;
    .github/*|.vscode/*) return 0 ;;
    LICENSE*|CHANGELOG*) return 0 ;;
    *) return 1 ;;
  esac
}

for f in "${changed[@]}"; do
  if should_skip "$f"; then
    continue
  fi
  exit 1
done

echo "Only documentation or meta files changed — skipping Vercel build."
exit 0
