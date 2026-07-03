# JWT Key Setup

## Purpose

IMS access tokens use RS256 when JWT PEM keys are configured. If they are absent, the system falls back to a shared HS256 secret so deployed instances can still verify the same tokens.

## Environment Variables

- `JWT_PRIVATE_KEY`: PKCS#8 PEM private key used by the auth service to sign access tokens.
- `JWT_PUBLIC_KEY`: SPKI PEM public key used by route middleware and token verification.
- `SESSION_SECRET`: HMAC secret used for the session cookie wrapper and the shared-secret JWT fallback.

## Local Development

1. Generate a key pair with the shared helper or your own OpenSSL command.
2. Store the PEM strings in your shell environment or `.env.local`.
3. Restart the apps after changing the keys.

Example:

```bash
pnpm --filter @ims/shared-auth exec tsx -e "import { generateRSAKeyPair } from './src'; const { publicKey, privateKey } = generateRSAKeyPair(); console.log(privateKey); console.log(publicKey);"
```

## Production

- Preferred: store the private key and matching public key in the deployment secret manager/runtime environment.
- Fallback: ensure `SESSION_SECRET` is set consistently across all instances.
- Rotate keys by deploying the new pair together; old access tokens remain valid only until their short expiry window ends.

## Notes

- Do not commit PEM keys to the repository.
- Do not log raw tokens or key material.
- Avoid relying on per-process generated keys in production. Use PEM keys or the shared `SESSION_SECRET` fallback.
