import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const globalPersonLookupMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();

vi.mock('../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../lib/runtime', () => ({
  studentQueryService: {
    globalPersonLookup: (...args: any[]) => globalPersonLookupMock(...args),
  },
  branchScopeResolver: {
    resolveAllowedBranches: (...args: any[]) => resolveAllowedBranchesMock(...args),
  },
}));

vi.mock('../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('Person Lookup API route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    globalPersonLookupMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
  });

  it('GET /api/v1/person/lookup rejects if query or branchId is missing', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: { userId: 'user-1', permissions: ['admission.create'] },
      })
    );

    const { GET } = await import('./route');
    const response = await GET(
      new Request('http://localhost/api/v1/person/lookup?query=fatima@example.om', {
        method: 'GET',
      })
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_VAL_FAILED');
  });

  it('GET /api/v1/person/lookup rejects if branchId is not in user allowed branches', async () => {
    const targetBranchId = '22222222-2222-2222-2222-222222222222';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: { userId: 'user-1', permissions: ['admission.create'], activeBranchId: '11111111-1111-1111-1111-111111111111' },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue(['11111111-1111-1111-1111-111111111111']);

    const { GET } = await import('./route');
    const response = await GET(
      new Request(`http://localhost/api/v1/person/lookup?query=fatima@example.om&branchId=${targetBranchId}`, {
        method: 'GET',
      })
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_AUTH_BRANCH_DENIED');
  });

  it('GET /api/v1/person/lookup succeeds when params are valid and authorized', async () => {
    const studentId = '11111111-1111-1111-1111-111111111111';
    const targetBranchId = '11111111-1111-1111-1111-111111111111';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: { userId: 'user-1', permissions: ['admission.create'], activeBranchId: targetBranchId },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue([targetBranchId]);
    globalPersonLookupMock.mockResolvedValue({
      personFound: true,
      personId: 'person-1',
      studentProfileId: studentId,
      preflight: null,
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request(`http://localhost/api/v1/person/lookup?query=fatima@example.om&branchId=${targetBranchId}`, {
        method: 'GET',
      })
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.personFound).toBe(true);
    expect(globalPersonLookupMock).toHaveBeenCalledWith('fatima@example.om', targetBranchId, { revealSensitive: false });
  });

  it('GET /api/v1/person/lookup reveals contact values when caller has permission', async () => {
    const targetBranchId = '11111111-1111-1111-1111-111111111111';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['admission.create', 'student.reveal_pii'],
          activeBranchId: targetBranchId,
        },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue([targetBranchId]);
    globalPersonLookupMock.mockResolvedValue({
      personFound: true,
      personId: 'person-1',
      studentProfileId: '11111111-1111-1111-1111-111111111111',
      maskedMobile: '+96899112233',
      maskedEmail: 'fatima@example.com',
      maskedNationalId: '12******89',
      preflight: null,
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request(`http://localhost/api/v1/person/lookup?query=fatima@example.om&branchId=${targetBranchId}`, {
        method: 'GET',
      })
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(globalPersonLookupMock).toHaveBeenCalledWith('fatima@example.om', targetBranchId, { revealSensitive: true });
  });
});
