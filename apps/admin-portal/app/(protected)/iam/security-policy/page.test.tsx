import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import IamSecurityPolicyPage from './page';

const mockGetSecurityPolicy = vi.fn();

vi.mock('../../../lib/runtime', () => ({
  securityPolicyService: {
    getSecurityPolicy: (...args: any[]) => mockGetSecurityPolicy(...args),
  },
}));

vi.mock('../../../lib/auth-guard', () => ({
  getSession: () => Promise.resolve({
    userId: 'actor-id',
    permissions: ['iam.policy.read', 'iam.policy.write'],
    activeBranchId: 'branch-id',
  }),
}));

describe('IamSecurityPolicyPage', () => {
  it('renders security policy settings and values', async () => {
    mockGetSecurityPolicy.mockResolvedValue({
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 15,
      passwordMinLength: 8,
      passwordExpiryDays: 90,
      resetTokenExpiryMinutes: 60,
      accessTokenExpiryMinutes: 15,
      refreshTokenExpiryDays: 7,
      maxConcurrentSessions: 3,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecial: true,
    });

    const page = await IamSecurityPolicyPage();
    const html = renderToStaticMarkup(page);
    expect(html).toContain('Security Policy');
    expect(html).toContain('Max failed attempts');
    expect(html).toContain('5');
    expect(html).toContain('Concurrent sessions');
    expect(html).toContain('3');
  });
});
