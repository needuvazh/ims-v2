## 1. Schema Refactoring & Migrations

- [x] 1.1 Add the `PasswordResetToken` model and relationship mapping in `packages/database/prisma/schema.prisma`.
- [x] 1.2 Generate a Prisma migration for the token table using `prisma migrate dev`.
- [x] 1.3 Verify the migration updates the PostgreSQL database successfully and regenerates the Prisma Client.

## 2. Repository & Service Integration

- [x] 2.1 Update `packages/identity-access/src/application/auth-service.ts` to define `AuthResetTokenRepository` and add required methods to `AuthUserRepository` and `AuthSessionRepository`.
- [x] 2.2 Create `packages/database/src/repositories/prisma-reset-token-repository.ts` implementing `AuthResetTokenRepository`.
- [x] 2.3 Update `packages/database/src/repositories/prisma-user-repository.ts` to implement `updatePasswordAndUnlock`.
- [x] 2.4 Update `packages/database/src/repositories/prisma-session-repository.ts` to implement `revokeAllSessionsForUser`.
- [x] 2.5 Export the new repository and update DI registrations in `packages/database/src/index.ts`.
- [x] 2.6 Implement `requestPasswordReset` and `resetPassword` in `AuthService` inside `packages/identity-access/src/application/auth-service.ts`, ensuring Zod schema validations, password complexity, audit logs, and outbox event creation.

## 3. Application & Unit Verification

- [x] 3.1 Write unit tests in `packages/identity-access/src/application/auth-service.test.ts` to assert:
  - Secure token creation, hashing, and 1-hour expiration.
  - User enumeration mitigation (success output for nonexistent or inactive users).
  - Successful password updates, failed-attempts resets, account unlocks, and session invalidation.
  - Failure checks for expired, used, or missing tokens.
  - Enforced password complexity rule failures.
- [x] 3.2 Run unit tests using `pnpm run test` (specifically for `identity-access` module) to ensure all tests pass.

## 4. UI Page Integration

- [x] 4.1 Update `apps/admin-portal/app/(auth)/sign-in/page.tsx` to link the "Forgot?" action button to `/forgot-password`.
- [x] 4.2 Create Zod schema validation in `apps/admin-portal/app/(auth)/forgot-password/schema.ts` for recovery request.
- [x] 4.3 Create Server Actions in `apps/admin-portal/app/(auth)/forgot-password/actions.ts` to call `AuthService.requestPasswordReset`.
- [x] 4.4 Build the **Forgot Password UI Page** (`apps/admin-portal/app/(auth)/forgot-password/page.tsx`) with animated input form, validation errors, and success state using Tailwind CSS and Framer Motion.
- [x] 4.5 Create Zod schema validation in `apps/admin-portal/app/(auth)/reset-password/schema.ts` for password reset.
- [x] 4.6 Create Server Actions in `apps/admin-portal/app/(auth)/reset-password/actions.ts` to call `AuthService.resetPassword`.
- [x] 4.7 Build the **Reset Password UI Page** (`apps/admin-portal/app/(auth)/reset-password/page.tsx`) with token extraction, dual password fields, real-time validation checks, and redirection on success.

## 5. Verification & E2E Validation

- [x] 5.1 Run `pnpm run typecheck` and `pnpm run lint` to verify compilation and code quality.
- [x] 5.2 Boot the application (`pnpm run dev`) and manually test the forgot password and reset password flows.
- [x] 5.3 Verify that the generated reset tokens are logged to stdout and that clicking the link redirects correctly.
- [x] 5.4 Verify that audit entries and outbox events are appended correctly.
