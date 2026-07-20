#!/bin/sh
# Refuse to run destructive/seeding Prisma commands against a non-local database.
#
# Why: `db:migrate`, `db:seed` and `db:reset` inherit whatever DATABASE_URL is
# active. The runbook tells developers to swap `.env` to the shared remote dev
# URL for remote access — if they forget to swap back, `pnpm db:seed` would
# write the demo CRM dataset and the `test@nextcrm.app` admin user into the
# shared database (db:seed sets SEED_DEMO_DATA=1, which deliberately defeats
# the seed's own "don't inject demo records" gate), and `pnpm db:reset` would
# additionally run `migrate deploy` against a database with known drift.
#
# Resolution order must match the Prisma CLI's: Prisma loads `.env` via dotenv,
# which does NOT override variables already present in the environment. So an
# exported DATABASE_URL wins; otherwise the value comes from `.env`. The shell
# does not read `.env` on its own, so this script parses it.
#
# POSIX sh only — pnpm runs scripts with /bin/sh.

set -e

url="${DATABASE_URL:-}"
source_desc="the exported DATABASE_URL environment variable"

if [ -z "$url" ] && [ -f .env ]; then
  # Last non-commented DATABASE_URL assignment wins, matching dotenv.
  url=$(sed -n 's/^[[:space:]]*\(export[[:space:]][[:space:]]*\)\{0,1\}DATABASE_URL[[:space:]]*=[[:space:]]*//p' .env | tail -n 1)
  url=$(printf '%s' "$url" | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/")
  source_desc=".env"
fi

if [ -z "$url" ]; then
  echo "db guard: DATABASE_URL is not set and no value was found in .env." >&2
  echo "  A fresh clone has no .env (it is gitignored). Create one containing:" >&2
  echo '    DATABASE_URL="postgresql://nextcrm:nextcrm@localhost:5433/nextcrm"' >&2
  echo "  See docs/internal/aqunama-setup-runbook.md for the full prerequisites." >&2
  exit 1
fi

# postgresql://user:pass@host:port/db?query  ->  host
#
# Strip the path and query string BEFORE splitting off the userinfo, so only
# the authority section (userinfo@host:port) is ever considered when finding
# the host. Otherwise a literal "@localhost" inside the query string (e.g.
# ?application_name=a@localhost) would be greedily picked up by the userinfo
# split as if it were part of the host, producing a false PASS against a
# remote database.
rest=${url#*://}
authority=${rest%%/*}
authority=${authority%%\?*}
# Greedy split on the LAST '@' within the authority section only. This is
# what makes a literal '@' inside a password safe (e.g. user:p@ss@host).
hostport=${authority##*@}

# Bracketed IPv6 host, e.g. "[::1]:5433" or "[2001:db8::1]:5432". Must be
# checked before the ":" port strip below, since an IPv6 address itself
# contains colons.
case "$hostport" in
  \[*\]*)
    host=${hostport#\[}
    host=${host%%\]*}
    ;;
  *)
    host=${hostport%%:*}
    ;;
esac

case "$host" in
  localhost | 127.0.0.1 | ::1 | "")
    exit 0
    ;;
esac

# Never echo the URL itself — the remote one carries a password.
echo "db guard: refusing to run. DATABASE_URL (from $source_desc) points at host '$host', not the local Docker Postgres." >&2
echo "  This command migrates and/or seeds the database it is pointed at. Against the" >&2
echo "  shared remote dev DB that would inject demo CRM records and an admin user," >&2
echo "  and (for db:reset) replay migrations over known schema drift." >&2
echo "  Fix: set DATABASE_URL in .env back to the local default before re-running:" >&2
echo '    DATABASE_URL="postgresql://nextcrm:nextcrm@localhost:5433/nextcrm"' >&2
exit 1
