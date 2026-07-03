# IMS Product Setup

## Purpose

This guide covers the minimum setup required to run and deploy the IMS admin portal safely.

## What Must Be Configured

- PostgreSQL database connection.
- Session signing secret.
- JWT access-token keys or a shared fallback secret.
- Public app origin for generated links when needed.

## Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string.
- `SESSION_SECRET`: used to sign the session cookie and as the shared JWT fallback secret.
- `JWT_PRIVATE_KEY`: PKCS#8 PEM private key for RS256 access-token signing.
- `JWT_PUBLIC_KEY`: SPKI PEM public key for RS256 access-token verification.
- `NEXT_PUBLIC_APP_URL`: optional public app URL for places that need an explicit origin.
- `FRONTEND_URL`: optional public URL used by password reset links.

## Setup Flow

1. Provision PostgreSQL and run migrations.
2. Set `SESSION_SECRET` to the same value in every deployed instance.
3. Prefer setting `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` in the deployment secret manager.
4. If PEM keys are not available, use one shared `SESSION_SECRET` across all instances.
5. Deploy all instances with the same auth environment.
6. Sign in and verify that protected pages load, then sign out and confirm redirect goes to the deployed origin.

## Auth Rules

- Sign-out now redirects from the incoming request origin, not `localhost`.
- JWT verification failures should be treated as unauthenticated requests.
- Do not use per-process generated JWT keys in production.
- If you rotate JWT keys, deploy the new pair together.

## Production Checklist

- `SESSION_SECRET` is identical across all instances.
- `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` are either both set or both omitted.
- `NEXT_PUBLIC_APP_URL` matches the deployed public URL if the app needs it elsewhere.
- Protected routes return 401 or a sign-in redirect, not stack traces, when a token is invalid.

## Smoke Test

- Log in with a valid account.
- Open a protected page.
- Sign out.
- Confirm the browser lands on `/sign-in` on the deployed domain.
