import { beforeEach, describe, expect, it, vi } from 'vitest';

const createEnrollmentMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();

vi.mock('../../../../lib/runtime', () => ({
  enrollmentService: {
    createEnrollment: createEnrollmentMock,
  },
  branchScopeResolver: {
    resolveAllowedBranches: resolveAllowedBranchesMock,
  },
}));

const withPermissionMock = vi.fn();
const withRouteObservabilityMock = vi.fn((_headers, cb) => cb());
const applyObservabilityResponseHeadersMock = vi.fn();

vi.mock('../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../lib/observability', () => ({
  withRouteObservability: withRouteObservabilityMock,
  applyObservabilityResponseHeaders: applyObservabilityResponseHeadersMock,
  createStructuredLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
  getCurrentRequestContext: () => ({}),
}));

describe('enrollments create route', () => {
  beforeEach(() => {
    createEnrollmentMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
    withPermissionMock.mockReset();
    withPermissionMock.mockImplementation((_req, _perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          activeBranchId: 'branch-1',
        },
      }),
    );
  });

  it('rejects WalkIn enrollments in the generic endpoint', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('http://localhost/api/v1/enrollments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          courseId: '11111111-1111-1111-1111-111111111111',
          batchId: '22222222-2222-2222-2222-222222222222',
          enrollmentType: 'WalkIn',
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.errorCode).toBe('ERR_ENR_GENERIC_WALKIN_BLOCKED');
    expect(createEnrollmentMock).not.toHaveBeenCalled();
  });
});
