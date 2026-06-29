import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IamError } from '@ims/identity-access';

const getSessionMock = vi.fn();
const switchBranchMock = vi.fn();

vi.mock('../../../../lib/auth-guard', () => ({ getSession: getSessionMock }));
vi.mock('../../../../lib/runtime', () => ({ branchAccessService: { switchActiveBranch: switchBranchMock } }));
vi.mock('../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('auth switch branch route', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'test-session-secret-test-session-secret';
    getSessionMock.mockReset();
    switchBranchMock.mockReset();
  });

  it('returns forbidden for unassigned branch', async () => {
    getSessionMock.mockResolvedValue({ userId: 'user-1', permissions: ['iam.user.read'], activeBranchId: '11111111-1111-1111-1111-111111111111', accessTokenJti: 'jti-1', displayName: 'User 1', roles: [], dataScopes: [], hashedRefreshToken: 'hash', lastActivityAt: Date.now(), status: 'Active', expiresAt: Date.now() + 60_000 });
    switchBranchMock.mockRejectedValue(new IamError('IAM-AUTHZ-002', 403, 'Branch access denied', 'تم رفض الوصول إلى الفرع'));

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/v1/auth/switch-branch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ branchId: '22222222-2222-2222-2222-222222222222' }),
    }));

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.errorCode).toBe('IAM-AUTHZ-002');
  });
});
