# JWT Key Setup

## Purpose

IMS access tokens use RS256. The admin portal and services require both a private key for signing and a public key for verification.

## Environment Variables

- `JWT_PRIVATE_KEY`: PKCS#8 PEM private key used by the auth service to sign access tokens.
- `JWT_PUBLIC_KEY`: SPKI PEM public key used by route middleware and token verification.
- `SESSION_SECRET`: HMAC secret used for the legacy session cookie wrapper.

## Local Development

1. Generate a key pair with the shared helper or your own OpenSSL command.
2. Store the PEM strings in your shell environment or `.env.local`.
3. Restart the apps after changing the keys.

Example:

```bash
pnpm --filter @ims/shared-auth exec tsx -e "import { generateRSAKeyPair } from './src'; const { publicKey, privateKey } = generateRSAKeyPair(); console.log(privateKey); console.log(publicKey);"
```

## Production

- Store the private key in the deployment secret manager.
- Store the matching public key in the runtime environment for verification.
- Rotate keys by deploying the new pair together; old access tokens remain valid only until their short expiry window ends.

## Notes

- Do not commit PEM keys to the repository.
- Do not log raw tokens or key material.
- The shared auth package can generate a temporary dev pair when env keys are absent, but production must always supply both keys.
