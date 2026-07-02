import { beforeEach, describe, expect, it, vi } from 'vitest';

const recordWalkInPaymentMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();
const enrollmentFindUniqueMock = vi.fn();

vi.mock('../../../../../../lib/runtime', () => ({
  enrollmentService: {
    recordWalkInPayment: recordWalkInPaymentMock,
  },
  branchScopeResolver: {
    resolveAllowedBranches: resolveAllowedBranchesMock,
  },
  prisma: {
    enrollment: {
      findUnique: enrollmentFindUniqueMock,
    },
  },
}));

const withPermissionMock = vi.fn();
const withRouteObservabilityMock = vi.fn((_headers, cb) => cb());
const applyObservabilityResponseHeadersMock = vi.fn();

vi.mock('../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../../lib/observability', () => ({
  withRouteObservability: withRouteObservabilityMock,
  applyObservabilityResponseHeaders: applyObservabilityResponseHeadersMock,
  createStructuredLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
  }),
  getCurrentRequestContext: () => ({}),
}));

describe('walk-in payment route', () => {
  beforeEach(() => {
    recordWalkInPaymentMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
    enrollmentFindUniqueMock.mockReset();
    withPermissionMock.mockReset();
    withPermissionMock.mockImplementation((_req, _perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          activeBranchId: 'branch-1',
        },
      })
    );
  });

  it('records payment when the enrollment is in scope', async () => {
    resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);
    enrollmentFindUniqueMock.mockResolvedValue({ branchId: 'branch-1' });
    recordWalkInPaymentMock.mockResolvedValue({
      enrollment: { enrollmentStatus: 'Confirmed' },
      confirmation: {
        confirmationNumber: 'WIC-2026-10001',
        documentUrl: 'https://storage.asti.edu.om/confirmations/WIC-2026-10001.pdf',
      },
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/enrollments/enr-1/walk-in-payment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paymentCollected: 120, remarks: 'Cash' }),
      }),
      { params: Promise.resolve({ id: 'enr-1' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(recordWalkInPaymentMock).toHaveBeenCalledWith('enr-1', 120, 'user-1', 'Cash', 'Cash');
  });

  it('rejects payment recording outside branch scope', async () => {
    resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);
    enrollmentFindUniqueMock.mockResolvedValue({ branchId: 'branch-2' });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/enrollments/enr-1/walk-in-payment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paymentCollected: 120 }),
      }),
      { params: Promise.resolve({ id: 'enr-1' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.errorCode).toBe('ERR_AUTH_BRANCH_DENIED');
    expect(recordWalkInPaymentMock).not.toHaveBeenCalled();
  });
});
