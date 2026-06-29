import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '@ims/shared-kernel';

const assertPermissionMock = vi.fn();
const getUserByIdMock = vi.fn();

vi.mock('../../../../../lib/auth-guard', () => ({ assertPermission: assertPermissionMock }));
vi.mock('../../../../../lib/runtime', () => ({ userService: { getUserById: getUserByIdMock } }));
vi.mock('../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('user detail route', () => {
  beforeEach(() => {
    assertPermissionMock.mockReset();
    getUserByIdMock.mockReset();
  });

  it('rejects branch-scope bypass for another user', async () => {
    assertPermissionMock.mockResolvedValue({ userId: 'user-1', permissions: ['iam.user.read'], activeBranchId: '11111111-1111-1111-1111-111111111111' });
    getUserByIdMock.mockRejectedValue(new DomainError('forbidden', 'Access denied: you are not authorized to access this branch.'));

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/users/user-2'), { params: { id: 'user-2' } });

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errorCode).toBe('FORBIDDEN');
  });
});
