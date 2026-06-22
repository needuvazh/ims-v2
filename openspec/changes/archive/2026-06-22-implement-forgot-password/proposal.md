## Why

The current Identity & Access Management (IAM) implementation is missing self-service password recovery options (Forgot Password & Reset Password flows). Users who forget their credentials must contact an administrator for manual password resets, creating operational overhead and security friction.

Implementing a secure, self-service password recovery workflow will:
1. Improve user experience by allowing secure credentials recovery directly from the Login page.
2. Reduce administrative burden by automating password reset token generation and validation.
3. Protect against enumeration attacks by returning generic success notifications at the reset request boundary.
4. Enforce security compliance by automatically revoking active sessions and clearing account lockouts upon successful password reset.

## What Changes

- **Schema Enhancements (`schema.prisma`):**
  - Add `PasswordResetToken` model to store cryptographic hashes of generated reset tokens, their expiration timestamps (`expiresAt`), usage status (`usedAt`), and creation timestamps.
  - Link `PasswordResetToken` to the `User` model.
- **Domain & Service Updates (`packages/identity-access`):**
  - Define `PasswordResetToken` repository interfaces (`AuthResetTokenRepository`) inside `AuthService` or as a standalone service interface.
  - Implement Zod schema validations for forgot password request (`requestResetCommandSchema`) and reset completion (`completeResetCommandSchema`).
  - Implement application service logic in `AuthService` (or a dedicated `PasswordResetService`) to handle token creation (using secure random bytes hashed with SHA-256), validation, and password updates.
  - Integrate password complexity policy rules (`passwordSchema`) during password reset completion.
  - Trigger active session revocation and reset failed attempts (unlocking the account) when a password reset is completed.
- **UI Screen Additions (`apps/admin-portal`):**
  - Add the **Forgot Password Screen** at `apps/admin-portal/app/(auth)/forgot-password` to collect the user's email.
  - Add the **Reset Password Screen** at `apps/admin-portal/app/(auth)/reset-password` to capture the new password with token verification.
  - Connect the "Forgot?" link on the sign-in page to the new `/forgot-password` route.
- **Audit & Events Logging:**
  - Create and publish `PasswordResetRequested` and `PasswordResetCompleted` audit log records.
  - Append corresponding transactional outbox events to support future asynchronous email notifications.

## Capabilities

### New Capabilities
- `forgot-password-flow`: End-to-end self-service credential recovery, validating token constraints and updating user credentials.

### Modified Capabilities
- `database`: Added `PasswordResetToken` model and database relationship mapping user reset history.
- `identity-access`: Added application workflows for password reset tokens generation and validation.
- `admin-portal`: New auth screens (`/forgot-password` and `/reset-password`) for password recovery.

## Impact

- **Security & Compliance:** Token hashes prevent token exposure in the database. Deleting or revoking sessions on password reset mitigates the risk of hijacked sessions persisting after credentials update.
- **Privacy:** Returning generic success messages protects user directory lists from malicious enumeration probing.
- **Auditability:** Secure logging of password reset events guarantees complete audit visibility for regulatory compliance (e.g., Oman standards).

## Source Anchors

- FRD requirements: `docs/architecture/frd/Module 1: Identity & Access Management.md` (FR-IAM-013, Audit Events `PasswordResetRequested` & `PasswordResetCompleted`, and Screen design IAM-UI-001 Actions).
- Technology Stack Guidelines: `docs/ims-technology-stack-recommendation.md` (Section 5, 8, and 12).
