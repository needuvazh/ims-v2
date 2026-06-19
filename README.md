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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ims_dev?schema=public
```

Then run Prisma migrations and seed data:

```bash
pnpm exec prisma migrate dev --schema=packages/database/prisma/schema.prisma
pnpm --filter @ims/database run seed
```

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
