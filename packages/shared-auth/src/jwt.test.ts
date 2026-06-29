import { describe, expect, it } from 'vitest';
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

    const tampered = `${token.slice(0, -1)}x`;
    await expect(JwtService.verifyAccessToken(tampered, keys.publicKey)).rejects.toThrow();
  });
});
