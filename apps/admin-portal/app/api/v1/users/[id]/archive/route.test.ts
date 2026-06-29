import { beforeEach, describe, expect, it, vi } from 'vitest';

const assertPermissionMock = vi.fn();
const archiveUserMock = vi.fn();

vi.mock('../../../../../../lib/auth-guard', () => ({ assertPermission: assertPermissionMock }));
vi.mock('../../../../../../lib/runtime', () => ({ userService: { archiveUser: archiveUserMock } }));
vi.mock('../../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('user archive route', () => {
  beforeEach(() => {
    assertPermissionMock.mockReset();
    archiveUserMock.mockReset();
  });

  it('archives a user when authorized', async () => {
    assertPermissionMock.mockResolvedValue({ userId: 'user-1', permissions: ['iam.user.archive'], activeBranchId: '11111111-1111-1111-1111-111111111111' });
    archiveUserMock.mockResolvedValue(undefined);

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/v1/users/user-1/archive', { method: 'POST' }), { params: { id: 'user-1' } });

    expect(response.status).toBe(200);
    expect(archiveUserMock).toHaveBeenCalledWith('user-1', expect.any(Object));
  });
});
