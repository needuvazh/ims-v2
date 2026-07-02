import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const findByIdMock = vi.fn();
const enqueueWaitlistMock = vi.fn();

vi.mock('../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../../lib/runtime', () => ({
  batchService: {
    batchRepository: { findById: findByIdMock },
    enqueueWaitlist: enqueueWaitlistMock,
  },
}));

vi.mock('../../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

const findFirstMock = vi.fn();
const findManyMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock('@ims/database', () => ({
  prisma: {
    userBranchAccess: { findFirst: findFirstMock },
    userRole: { findMany: findManyMock },
    studentProfile: { findUnique: findUniqueMock },
    lead: { findUnique: findUniqueMock },
  },
}));

describe('Batch waitlist enqueue API routes', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    findByIdMock.mockReset();
    enqueueWaitlistMock.mockReset();
    findFirstMock.mockReset();
    findManyMock.mockReset();
    findUniqueMock.mockReset();
  });

  it('POST /api/v1/batches/[id]/waitlist enqueues candidate successfully with correct permissions', async () => {
    const studentId = '11111111-1111-1111-1111-111111111111';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['batch.waitlist.manage'],
        },
      })
    );

    findByIdMock.mockResolvedValue({ id: 'batch-123', branchId: 'branch-123' });
    findFirstMock.mockResolvedValue({ id: 'access-123', status: 'Active' });
    findUniqueMock.mockResolvedValue({ id: studentId });
    enqueueWaitlistMock.mockResolvedValue({ id: 'wl-123', queuePosition: 1, status: 'Waiting' });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/batches/batch-123/waitlist', {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      }),
      { params: Promise.resolve({ id: 'batch-123' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.queuePosition).toBe(1);
    expect(enqueueWaitlistMock).toHaveBeenCalledWith('batch-123', studentId, null, 'user-1');
  });

  it('POST /api/v1/batches/[id]/waitlist rejects enqueuing if user lacks branch access and is not admin', async () => {
    const studentId = '11111111-1111-1111-1111-111111111111';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['batch.waitlist.manage'],
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
        body: JSON.stringify({ studentId }),
      }),
      { params: Promise.resolve({ id: 'batch-123' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_IAM_INSUFFICIENT_PERMISSIONS');
  });

  it('POST /api/v1/batches/[id]/waitlist rejects enqueuing if both studentId and leadId are provided', async () => {
    const studentId = '11111111-1111-1111-1111-111111111111';
    const leadId = '22222222-2222-2222-2222-222222222222';
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['batch.waitlist.manage'],
        },
      })
    );

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/batches/batch-123/waitlist', {
        method: 'POST',
        body: JSON.stringify({ studentId, leadId }),
      }),
      { params: Promise.resolve({ id: 'batch-123' }) }
    );

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('CRS-VAL-BATCHES-INVALID_BODY');
    expect(body.invalidFields[0].message).toBe('Exactly one of studentId or leadId must be provided.');
  });
});
