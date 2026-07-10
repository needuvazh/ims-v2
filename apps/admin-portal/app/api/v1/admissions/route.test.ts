import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();
const createAdmissionDraftDirectMock = vi.fn();

vi.mock('../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../lib/runtime', () => ({
  admissionService: {
    createAdmissionDraftDirect: createAdmissionDraftDirectMock,
  },
  branchScopeResolver: { resolveAllowedBranches: resolveAllowedBranchesMock },
}));

vi.mock('../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (
    _headers: Headers,
    handler: () => Promise<Response>,
  ) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('Admissions creation API routes', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
    createAdmissionDraftDirectMock.mockReset();
  });

  it('POST /api/v1/admissions successfully creates a draft admission', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['admission.create'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      }),
    );

    resolveAllowedBranchesMock.mockResolvedValue([
      '11111111-1111-1111-1111-111111111111',
    ]);
    createAdmissionDraftDirectMock.mockResolvedValue({
      admissionId: 'adm-123',
    });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/admissions', {
        method: 'POST',
        body: JSON.stringify({
          studentProfileId: '22222222-2222-2222-2222-222222222222',
          courseId: '33333333-3333-3333-3333-333333333333',
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.admissionId).toBe('adm-123');
    expect(createAdmissionDraftDirectMock).toHaveBeenCalledWith(
      {
        studentProfileId: '22222222-2222-2222-2222-222222222222',
        courseId: '33333333-3333-3333-3333-333333333333',
        leadId: null,
      },
      'user-1',
    );
  });

  it('POST /api/v1/admissions rejects if branch is not in user allowed branches list', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['admission.create'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      }),
    );

    resolveAllowedBranchesMock.mockResolvedValue([
      '11111111-1111-1111-1111-111111111111',
    ]);

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/admissions', {
        method: 'POST',
        body: JSON.stringify({
          studentProfileId: '22222222-2222-2222-2222-222222222222',
          branchId: '99999999-9999-9999-9999-999999999999', // out-of-scope branch
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_AUTH_BRANCH_DENIED');
  });

  it('POST /api/v1/admissions maps active duplicate error to 409 conflict', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['admission.create'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      }),
    );

    resolveAllowedBranchesMock.mockResolvedValue([
      '11111111-1111-1111-1111-111111111111',
    ]);
    createAdmissionDraftDirectMock.mockRejectedValue(
      new Error('ERR_ADM_ACTIVE_ADMISSION_EXISTS'),
    );

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/admissions', {
        method: 'POST',
        body: JSON.stringify({
          studentProfileId: '22222222-2222-2222-2222-222222222222',
        }),
      }),
    );

    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_ADM_ACTIVE_ADMISSION_EXISTS');
  });
});
