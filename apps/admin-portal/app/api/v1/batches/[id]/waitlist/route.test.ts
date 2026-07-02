import { describe, it, expect, vi, beforeEach } from 'vitest';

const findByIdMock = vi.fn();
const enqueueWaitlistMock = vi.fn();
const verifyBranchScopeMock = vi.fn();

vi.mock('../../../../../../lib/runtime', () => ({
  batchService: {
    batchRepository: {
      findById: findByIdMock,
    },
    enqueueWaitlist: enqueueWaitlistMock,
  },
  studentQueryService: {
    verifyBranchScope: verifyBranchScopeMock,
  },
}));

const withPermissionMock = vi.fn();
const withRouteObservabilityMock = vi.fn((headers, cb) => cb());
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

const findFirstMock = vi.fn();
const findManyMock = vi.fn();
vi.mock('@ims/database', () => ({
  prisma: {
    userBranchAccess: {
      findFirst: findFirstMock,
    },
    userRole: {
      findMany: findManyMock,
    },
    lead: {
      findUnique: vi.fn().mockResolvedValue({ id: 'lead-123', branchId: 'branch-123' }),
    },
  },
}));

describe('Batches Waitlist POST API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByIdMock.mockReset();
    enqueueWaitlistMock.mockReset();
    verifyBranchScopeMock.mockReset();
  });

  it('POST /api/v1/batches/[id]/waitlist enqueues candidate successfully with correct permissions', async () => {
    const studentProfileId = '11111111-1111-1111-1111-111111111111';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['waitinglist.manage'],
        },
      })
    );

    findByIdMock.mockResolvedValue({ id: 'batch-123', branchId: 'branch-123' });
    findFirstMock.mockResolvedValue({ id: 'access-123', status: 'Active' });
    verifyBranchScopeMock.mockResolvedValue(undefined);
    enqueueWaitlistMock.mockResolvedValue({ id: 'wl-123', queuePosition: 1, status: 'Waiting' });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/batches/batch-123/waitlist', {
        method: 'POST',
        body: JSON.stringify({ studentProfileId }),
      }),
      { params: Promise.resolve({ id: 'batch-123' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.queuePosition).toBe(1);
    expect(enqueueWaitlistMock).toHaveBeenCalledWith({ batchId: 'batch-123', studentProfileId, leadId: null, actorId: 'user-1' });
  });

  it('POST /api/v1/batches/[id]/waitlist rejects enqueuing if user lacks branch access and is not admin', async () => {
    const studentProfileId = '11111111-1111-1111-1111-111111111111';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['waitinglist.manage'],
        },
      })
    );

    findByIdMock.mockResolvedValue({ id: 'batch-123', branchId: 'branch-123' });
    findFirstMock.mockResolvedValue(null); // No branch access
    findManyMock.mockResolvedValue([]); // No roles

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/batches/batch-123/waitlist', {
        method: 'POST',
        body: JSON.stringify({ studentProfileId }),
      }),
      { params: Promise.resolve({ id: 'batch-123' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_IAM_INSUFFICIENT_PERMISSIONS');
  });

  it('POST /api/v1/batches/[id]/waitlist rejects enqueuing if both studentProfileId and leadId are provided', async () => {
    const studentProfileId = '11111111-1111-1111-1111-111111111111';
    const leadId = '22222222-2222-2222-2222-222222222222';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['waitinglist.manage'],
        },
      })
    );

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/batches/batch-123/waitlist', {
        method: 'POST',
        body: JSON.stringify({ studentProfileId, leadId }),
      }),
      { params: Promise.resolve({ id: 'batch-123' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('CRS-VAL-BATCHES-INVALID_BODY');
    expect(body.invalidFields[0].message).toBe('Exactly one of studentProfileId or leadId must be provided.');
  });

  it('POST /api/v1/batches/[id]/waitlist rejects if verifyBranchScope fails', async () => {
    const studentProfileId = '11111111-1111-1111-1111-111111111111';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['waitinglist.manage'],
        },
      })
    );

    findByIdMock.mockResolvedValue({ id: 'batch-123', branchId: 'branch-123' });
    findFirstMock.mockResolvedValue({ id: 'access-123', status: 'Active' });
    verifyBranchScopeMock.mockRejectedValue(new Error('ERR_AUTH_BRANCH_DENIED'));

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/batches/batch-123/waitlist', {
        method: 'POST',
        body: JSON.stringify({ studentProfileId }),
      }),
      { params: Promise.resolve({ id: 'batch-123' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_AUTH_BRANCH_DENIED');
  });
});
