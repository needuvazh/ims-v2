# IMS v2

Institute Management System foundation workspace.

## Stack

- Next.js App Router
- React
- TypeScript
- Prisma
- PostgreSQL
- Zod
- Tailwind CSS
- Turbo monorepo

## Local Database

Start PostgreSQL with Docker:

```bash
pnpm db:up
```

The app expects:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/ims_dev?schema=public
```

Then run Prisma migrations and seed data:

```bash
pnpm exec prisma migrate dev --schema=packages/database/prisma/schema.prisma
pnpm --filter @ims/database run seed
```

## First Run

For a fresh clone:

1. Install Node.js 20+ and pnpm 9.11.0.
2. Run `pnpm install` from the repo root.
3. Start PostgreSQL with `pnpm db:up`.
4. Ensure `DATABASE_URL` points at `localhost:5435`.
5. Run `pnpm exec prisma migrate dev --schema=packages/database/prisma/schema.prisma`.
6. Seed the database with `pnpm --filter @ims/database run seed`.
7. Start the admin portal with `pnpm --filter @ims/admin-portal dev`.

If you want the full workspace dev stack, use `pnpm dev` after the database is up and migrated.

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
