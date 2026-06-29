#!/usr/bin/env bash
set -euo pipefail

export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5435/ims_dev?schema=public}"

pnpm db:up

for _ in $(seq 1 60); do
  if docker compose exec -T postgres pg_isready -U postgres -d ims_dev >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

pnpm --filter @ims/database prisma generate
pnpm --filter @ims/database prisma validate
pnpm --filter @ims/database prisma migrate deploy
pnpm --filter @ims/database run seed
pnpm test:integration
pnpm test
pnpm lint
pnpm typecheck
pnpm build
