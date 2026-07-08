import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const searchUsersMock = vi.fn();
const getUserMock = vi.fn();

vi.mock('../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../lib/runtime', () => ({
  userService: {
    searchUsers: searchUsersMock,
    getUser: getUserMock,
  },
}));

vi.mock('../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (
    _headers: Headers,
    handler: () => Promise<Response>,
  ) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('iam users search route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    searchUsersMock.mockReset();
    getUserMock.mockReset();
  });

  it('returns enriched IAM users when authorized', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['iam.user.read'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      }),
    );
    searchUsersMock.mockResolvedValue({
      items: [{ id: 'user-1' }, { id: 'user-2' }],
      total: 2,
    });
    getUserMock
      .mockResolvedValueOnce({
        id: 'user-1',
        personId: 'person-1',
        username: 'trainer.one',
        fullName: 'Trainer One',
        email: 'trainer.one@example.com',
        phone: '+96870000000',
        status: 'Active',
        defaultBranchId: 'branch-1',
        branchIds: ['branch-1', 'branch-2'],
        dataScopes: [{ scopeType: 'Branch', branchId: 'branch-1' }],
      })
      .mockResolvedValueOnce({
        id: 'user-2',
        personId: 'person-2',
        username: 'trainer.two',
        fullName: 'Trainer Two',
        email: 'trainer.two@example.com',
        phone: null,
        status: 'Active',
        defaultBranchId: null,
        branchIds: [],
        dataScopes: [{ scopeType: 'All' }],
      });

    const { GET } = await import('./route');
    const response = await GET(
      new Request(
        'http://localhost/api/v1/iam/users/search?query=trainer&pageSize=8',
      ),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.total).toBe(2);
    expect(body.data.items[0]).toMatchObject({
      userId: 'user-1',
      personId: 'person-1',
      fullName: 'Trainer One',
      defaultBranchId: 'branch-1',
      branchIds: ['branch-1', 'branch-2'],
    });
    expect(body.data.items[1].mobile).toBeNull();
  });

  it('rejects invalid search queries', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['iam.user.read'],
          activeBranchId: null,
        },
      }),
    );

    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/v1/iam/users/search?query='),
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errorCode).toBe('IAM-VAL-USER-SEARCH-INVALID_QUERY');
  });
});
