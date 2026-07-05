import { describe, expect, it } from 'vitest';
import { decodeJwt } from 'jose';
import { JwtService, generateRSAKeyPair } from './jwt';

describe('JwtService', () => {
  it('rejects a tampered token signature', async () => {
    const keys = generateRSAKeyPair();
    const token = await JwtService.signAccessToken({
      userId: 'user-1',
      email: 'user@example.com',
      roles: ['ROLE_ACTIVE'],
      permissions: ['iam.user.read'],
      activeBranchId: null,
      jti: 'jti-1',
    }, keys.privateKey);

    const [header, payload, signature] = token.split('.');
    const tamperedPayload = `${payload.slice(0, -1)}${payload.slice(-1) === 'a' ? 'b' : 'a'}`;
    const tampered = [header, tamperedPayload, signature].join('.');
    await expect(JwtService.verifyAccessToken(tampered, keys.publicKey)).rejects.toThrow();
  });

  it('signs and verifies with a shared secret fallback', async () => {
    const secret = 'shared-production-secret-shared-production-secret';
    const token = await JwtService.signAccessToken({
      userId: 'user-1',
      email: 'user@example.com',
      roles: ['ROLE_ACTIVE'],
      permissions: ['iam.user.read'],
      activeBranchId: null,
      jti: 'jti-1',
    }, secret);

    const decoded = await JwtService.verifyAccessToken(token, secret);
    expect(decoded.email).toBe('user@example.com');
    expect(decoded.jti).toBe('jti-1');
  });

  it('defaults access tokens to 30 minutes', async () => {
    const secret = 'shared-production-secret-shared-production-secret';
    const token = await JwtService.signAccessToken({
      userId: 'user-1',
      email: 'user@example.com',
      roles: ['ROLE_ACTIVE'],
      permissions: ['iam.user.read'],
      activeBranchId: null,
      jti: 'jti-1',
    }, secret);

    const decoded = decodeJwt(token);
    expect((decoded.exp ?? 0) - (decoded.iat ?? 0)).toBe(30 * 60);
  });
});
