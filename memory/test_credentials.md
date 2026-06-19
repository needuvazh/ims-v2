# IMS v2 — Test Credentials

## Admin Portal

### Default Seed Admin Account
- **Email**: `admin@ims.com`
- **Password**: `Admin@123456`
- **Role**: Super Administrator (full access)
- **Created by**: `packages/database/prisma/seed.ts`

## Seed Institute
- **Code**: `AST-HQ`
- **Name**: Al-Saud Training Institute
- **Branch**: Riyadh Main Campus (`AST-RIYADH`)

## Setup Required Before Testing
1. PostgreSQL database running (see `.env.example`)
2. Run migrations: `pnpm prisma migrate dev --schema=packages/database/prisma/schema.prisma`
3. Run seed: `DATABASE_URL=... pnpm --filter @ims/database run seed`
4. Set `SESSION_SECRET` env var (min 32 bytes, base64)
5. Start admin portal: `pnpm --filter @ims/admin-portal run dev`

## Environment Variables Required
- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — HMAC signing secret (32+ random bytes, base64)
- `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000`
