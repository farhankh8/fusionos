#!/bin/sh
# FusionOS API container entrypoint
#
# Responsibilities:
# 1. Run Prisma migrations on boot (`prisma migrate deploy` — idempotent,
#    never resets or destroys data).
# 2. Execute the API server (CMD) as the non-root `fusionos` user via exec.
#
# SKIP_MIGRATIONS=true disables step 1 (e.g. when migrations are run by a
# dedicated job). Migration failures abort the boot — the container must not
# come up against an un-migrated schema.

set -e

if [ "${SKIP_MIGRATIONS}" = "true" ]; then
  echo "[entrypoint] SKIP_MIGRATIONS=true — skipping prisma migrate deploy"
else
  echo "[entrypoint] Running prisma migrate deploy..."
  npx prisma migrate deploy --schema=packages/database/prisma/schema.prisma
  echo "[entrypoint] Migrations up to date."
fi

exec "$@"
