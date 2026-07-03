# Developer Onboarding Guide

## Purpose

This guide captures the tooling, configs, skills, and local setup used to work on IMS v2.

## Workspace At A Glance

- Monorepo managed with `pnpm` and Turbo.
- Next.js admin portal in `apps/admin-portal`.
- Worker process in `apps/worker`.
- Shared domain and infrastructure packages in `packages/*`.
- PostgreSQL runs locally through Docker Compose.

## What Is Already In The Repo

### Package Manager And Scripts

- Package manager: `pnpm@9.11.0`
- Root scripts:
  - `pnpm dev`
  - `pnpm build`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm test:integration`
  - `pnpm test:e2e`
  - `pnpm typecheck`
  - `pnpm format`
  - `pnpm format:write`
  - `pnpm db:up`
  - `pnpm db:down`
  - `pnpm db:logs`
  - `pnpm db:reset`

### Core Tooling Config

- TypeScript: `tsconfig.base.json` uses `strict: true`, `ES2022`, bundler resolution, and `noEmit`.
- ESLint: `eslint.config.mjs` uses Next.js core web vitals, TypeScript rules, Prettier integration, and repo-specific rule overrides.
- Prettier: `.prettierrc.json` uses semicolons, single quotes, and trailing commas.
- Turbo: `turbo.json` defines `build`, `dev`, `lint`, `test`, `typecheck`, and `clean` tasks.
- Workspace layout: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
- Playwright: `playwright.config.ts` runs E2E tests from `tests/e2e` against `http://127.0.0.1:3000`.
- Vitest: `vitest.config.ts` targets `tests/**/*.spec.ts` plus `src` and `app` tests.

### App And Infrastructure Config

- Admin portal: `apps/admin-portal/package.json`
  - `next dev -p 3000`
  - `next build`
  - `next start -p 3000`
  - `eslint .`
  - `tsc -p tsconfig.json --noEmit`
  - `vitest run`
- Worker: `apps/worker/package.json`
  - `tsx watch --env-file=../../.env src/index.ts`
  - `tsc -p tsconfig.json`
  - `node dist/index.js`
- Next config: `apps/admin-portal/next.config.ts`
  - transpiles shared `@ims/*` packages
  - allows local dev origin `127.0.0.1`
  - permits remote images from Unsplash, Pexels, and `i.pravatar.cc`
- Database: `packages/database/prisma/schema.prisma`
- Local DB: `compose.yaml` runs PostgreSQL 16 on port `5435`
- Env example: `.env.example` currently exposes `DATABASE_URL`

## Local Setup

1. Install Node.js LTS and `pnpm` 9.11.0.
2. Start PostgreSQL:

```bash
pnpm db:up
```

3. Copy `.env.example` to `.env` if needed and verify `DATABASE_URL`.
4. Run Prisma migrations:

```bash
pnpm exec prisma migrate dev --schema=packages/database/prisma/schema.prisma
```

5. Seed data if required:

```bash
pnpm --filter @ims/database run seed
```

6. Start the admin portal:

```bash
pnpm --filter @ims/admin-portal dev
```

## Recommended VS Code Extensions

There is no checked-in `.vscode/` folder yet, so these are recommended rather than enforced.

- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- Error Lens
- GitLens
- Playwright Test for VS Code
- Turbo Console Log, if you want quick debug logging during development

## OpenCode And Agent Skills

### OpenCode Workflow Skills

Use these for OpenSpec-based work and repository workflow:

- `openspec-apply-change`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-continue-change`
- `openspec-explore`
- `openspec-ff-change`
- `openspec-new-change`
- `openspec-onboard`
- `openspec-propose`
- `openspec-sync-specs`
- `openspec-verify-change`

### Development Skills Present In The Workspace

- `monorepo-management` - pnpm/Turbo workspace practices
- `nextjs-app-router-patterns` - Next.js App Router guidance
- `openapi-spec-generation` - API spec generation and contract work
- `prisma-client-api` - Prisma query and client usage
- `prisma-database-setup` - database and Prisma setup
- `react-hook-form-zod` - validated form patterns
- `typescript-advanced-types` - advanced TypeScript modeling
- `webapp-testing` - local app testing with Playwright
- `playwright-cli` - browser automation and test execution
- `playwright-best-practices` - reliable Playwright patterns
- `zod` - schema validation practices
- `find-skills` - finding additional skills when needed

## Practical Development Notes

- Keep business logic in the domain and application packages, not in route handlers.
- Use `pnpm` workspace filters when targeting a single app or package.
- Prefer `pnpm lint`, `pnpm typecheck`, and `pnpm test` before pushing.
- Use `pnpm test:e2e` for browser-level validation once the admin portal is running.
- Check `docs/ims-technology-stack-recommendation.md` and `docs/architecture/` for broader project context.

## Gaps To Consider Adding Later

- Checked-in `.vscode/settings.json` and `.vscode/extensions.json`
- Node version pinning via `.nvmrc` or `.tool-versions`
- A dedicated `CONTRIBUTING.md`
- A short environment variable reference beyond `DATABASE_URL`
