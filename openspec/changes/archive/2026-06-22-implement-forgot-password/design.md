## Context

Currently, the Institute Management System does not support self-service password recovery. Users who forget their passwords cannot reset them without administrative intervention.

This design implements a secure, self-service forgot password and reset password flow, adhering to strict validation standards, preventing email enumeration, and securing access recovery.

## Goals / Non-Goals

**Goals:**
- Add `PasswordResetToken` table in `schema.prisma` and establish user relations.
- Generate a Prisma migration for the token table.
- Define application service logic in `AuthService` to issue tokens, validate them, reset passwords, clear lockouts, and revoke active sessions.
- Enforce the standard password complexity schema on password reset.
- Create `/forgot-password` and `/reset-password` frontend pages in the `admin-portal`.
- Update the `/sign-in` screen to link to the forgot password screen.
- Log recovery events to console logs, write audit records, and append outbox events.

**Non-Goals:**
- Implementing SMTP/email service integrations. The generated recovery link will be outputted to structured system logs and an outbox event.
- Allowing password resets for deactivated or draft accounts.

## Decisions

### 1. Introduce the `PasswordResetToken` Model
We will add a new database model to persist reset tokens safely.
- **Model Definition (`schema.prisma`):**
  ```prisma
  model PasswordResetToken {
    id        String   @id @default(uuid()) @db.Uuid
    userId    String   @db.Uuid
    tokenHash String   @unique @db.VarChar(255)
    expiresAt DateTime @db.Timestamptz(6)
    usedAt    DateTime? @db.Timestamptz(6)
    createdAt DateTime @default(now()) @db.Timestamptz(6)

    user      User     @relation(fields: [userId], references: [id])

    @@index([userId])
    @@map("password_reset_tokens")
  }
  ```
- **One-to-many relationship:** Add `resetTokens PasswordResetToken[]` to the `User` model.
- **Cryptographic Hash Storage:** The token sent to the user is a cryptographically strong random string (`crypto.randomBytes(32).toString('hex')`). Only the SHA-256 hash of this string is stored in the database (`tokenHash`) to protect against token extraction via database read compromises.

### 2. Implement the Reset Request Flow (Forgot Password)
- **Endpoint/Action:** `POST /api/v1/auth/forgot-password` or Next.js server action `requestPasswordResetAction`.
- **Enumeration Protection:** If the email does not exist, or corresponds to a `Draft` or `Inactive` account, the API must return a generic success message (*"If an account matches that email, a password reset link has been sent."*). No reset token is generated for inactive/draft users.
- **Token Generation:** If a matching `Active` or `Locked` user is found:
  - Generate a secure token.
  - Expiry is set to **1 hour** in the future.
  - Store the hashed token in `PasswordResetToken`.
  - Log `identity.password_reset_requested` event to the `AuditLog`.
  - Log the full link `http://localhost:3000/reset-password?token=<raw_token>` to standard output logs for development/operations.
  - Append a transactional outbox event for sending a notification.

### 3. Implement the Reset Password Flow (Complete Reset)
- **Endpoint/Action:** `POST /api/v1/auth/reset-password` or Next.js server action `resetPasswordAction`.
- **Validation Rules:**
  - Token must exist, match, not be expired (`expiresAt > now`), and not have been used (`usedAt === null`).
  - The new password must satisfy the password complexity rules (`passwordSchema` in `user.ts`).
- **State Changes:**
  - Update user's `passwordHash` with a secure bcrypt hash (12 rounds).
  - Reset `failedLoginAttempts` to `0`.
  - If the user's status was `Locked`, transition the status to `Active` (resetting password acts as an automatic account unlock).
  - Mark token as used by setting `usedAt = now`.
  - **Session Invalidation:** Update all active user sessions (`UserSession`) to `Revoked`. This blocks compromised active sessions from persisting after a password reset.
  - Log `identity.password_reset_completed` event to the `AuditLog`.
  - Append a transactional outbox event.

### 4. Application Layer Interfaces
We will expand the interfaces inside `packages/identity-access/src/application/auth-service.ts`:
```typescript
export interface AuthResetTokenRepository {
  createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findActiveTokenByHash(tokenHash: string): Promise<{
    userId: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null>;
  markTokenAsUsed(tokenHash: string): Promise<void>;
}

// Add these to AuthUserRepository:
export interface AuthUserRepository {
  // ... existing methods
  updatePasswordAndUnlock(userId: string, passwordHash: string): Promise<void>;
}

// Add these to AuthSessionRepository:
export interface AuthSessionRepository {
  // ... existing methods
  revokeAllSessionsForUser(userId: string): Promise<void>;
}
```

---

## Risks / Trade-offs

- **Session Invalidation Overhead:** Revoking all active sessions requires database updates.
  - *Mitigation:* The `UserSession` update is done by index (`userId` and status `Active`), which executes in sub-millisecond times on PostgreSQL.
- **Brute Force on Reset Page:** Attackers could attempt token enumeration.
  - *Mitigation:* Tokens are 64 hexadecimal characters long (256 bits of entropy), making brute-force token scanning mathematically impossible.

---

## Migration Plan

1. **Schema Definition:** Add `PasswordResetToken` and link to `User` in `packages/database/prisma/schema.prisma`.
2. **Local Migration Generation:** Run `prisma migrate dev` (or appropriate pnpm script) to update the database schema and generate TS clients.
3. **Repository Adaptation:**
   - Implement `PrismaResetTokenRepository` in `packages/database/src/repositories/prisma-reset-token-repository.ts`.
   - Update `PrismaUserRepository` to implement `updatePasswordAndUnlock`.
   - Update `PrismaSessionRepository` to implement `revokeAllSessionsForUser`.
4. **Service Updates:** Update `AuthService` and tests to implement `requestPasswordReset` and `resetPassword` workflows.
5. **UI Pages:** Implement routes `(auth)/forgot-password` and `(auth)/reset-password` in the Next.js portal.
6. **Verify:** Execute tests `pnpm run test` and manual browser checks.
