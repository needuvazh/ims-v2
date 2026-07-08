import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const globalPersonLookupMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();

vi.mock('../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../lib/runtime', () => ({
  studentQueryService: {
    globalPersonLookup: (...args: any[]) => globalPersonLookupMock(...args),
  },
  branchScopeResolver: {
    resolveAllowedBranches: (...args: any[]) =>
      resolveAllowedBranchesMock(...args),
  },
}));

vi.mock('../../../../../lib/observability', () => ({
  withRouteObservability: async (
    _headers: Headers,
    handler: () => Promise<Response>,
  ) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('Student preflight lookup API route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    globalPersonLookupMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
  });

  it('POST /api/v1/students/preflight-lookup rejects when no lookup key is provided', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: '11111111-1111-1111-1111-111111111111',
          permissions: ['student.create'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      }),
    );

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/students/preflight-lookup', {
        method: 'POST',
        body: JSON.stringify({
          branchId: '11111111-1111-1111-1111-111111111111',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(400);
  });

  it('POST /api/v1/students/preflight-lookup uses the active branch context and supports national ID', async () => {
    const branchId = '11111111-1111-1111-1111-111111111111';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: branchId,
          permissions: ['student.create'],
          activeBranchId: branchId,
        },
      }),
    );

    resolveAllowedBranchesMock.mockResolvedValue([branchId]);
    globalPersonLookupMock.mockResolvedValue({
      personFound: false,
      preflight: null,
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/students/preflight-lookup', {
        method: 'POST',
        body: JSON.stringify({ nationalId: '123456789', branchId }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(globalPersonLookupMock).toHaveBeenCalledWith('123456789', branchId, {
      revealSensitive: false,
    });
  });
});
