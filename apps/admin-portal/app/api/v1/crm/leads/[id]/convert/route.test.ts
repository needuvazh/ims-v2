import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();
const getLeadByIdMock = vi.fn();
const convertLeadToAdmissionMock = vi.fn();

vi.mock('../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../../lib/runtime', () => ({
  leadService: { getLeadById: getLeadByIdMock },
  branchScopeResolver: { resolveAllowedBranches: resolveAllowedBranchesMock },
  leadConversionOrchestrator: { convertLeadToAdmission: convertLeadToAdmissionMock },
}));

vi.mock('../../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('CRM lead convert API route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
    getLeadByIdMock.mockReset();
    convertLeadToAdmissionMock.mockReset();
  });

  it('POST /api/v1/crm/leads/[id]/convert successfully calls orchestrator and returns admission details', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['lead.convert'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue(['11111111-1111-1111-1111-111111111111']);

    getLeadByIdMock.mockResolvedValue({
      id: 'lead-123',
      branchId: '11111111-1111-1111-1111-111111111111',
      counselorId: 'user-1',
    });

    convertLeadToAdmissionMock.mockResolvedValue({
      admissionId: 'admission-123',
      studentProfileId: 'profile-123',
    });

    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/v1/crm/leads/lead-123/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents: [
          {
            fileName: 'civil.pdf',
            fileKey: 'uploads/civil.pdf',
            fileType: 'application/pdf',
            documentType: 'CIVIL_ID_FRONT',
          },
        ],
      }),
    });

    const response = await POST(req, {
      params: Promise.resolve({ id: 'lead-123' }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.admissionId).toBe('admission-123');
    expect(convertLeadToAdmissionMock).toHaveBeenCalledWith(
      'lead-123',
      [
        {
          fileName: 'civil.pdf',
          fileKey: 'uploads/civil.pdf',
          fileType: 'application/pdf',
          documentType: 'CIVIL_ID_FRONT',
        },
      ],
      'user-1'
    );
  });

  it('POST /api/v1/crm/leads/[id]/convert maps ERR_ADM_AGE_LIMIT to 400 bad request', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['lead.convert'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue(['11111111-1111-1111-1111-111111111111']);

    getLeadByIdMock.mockResolvedValue({
      id: 'lead-123',
      branchId: '11111111-1111-1111-1111-111111111111',
      counselorId: 'user-1',
    });

    convertLeadToAdmissionMock.mockRejectedValue(new Error('ERR_ADM_AGE_LIMIT'));

    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/v1/crm/leads/lead-123/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents: [
          {
            fileName: 'civil.pdf',
            fileKey: 'uploads/civil.pdf',
            fileType: 'application/pdf',
            documentType: 'CIVIL_ID_FRONT',
          },
        ],
      }),
    });

    const response = await POST(req, {
      params: Promise.resolve({ id: 'lead-123' }),
    });

    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_ADM_AGE_LIMIT');
  });

  it('POST /api/v1/crm/leads/[id]/convert maps ERR_ADM_ACTIVE_ADMISSION_EXISTS to 409 conflict', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['lead.convert'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue(['11111111-1111-1111-1111-111111111111']);

    getLeadByIdMock.mockResolvedValue({
      id: 'lead-123',
      branchId: '11111111-1111-1111-1111-111111111111',
      counselorId: 'user-1',
    });

    convertLeadToAdmissionMock.mockRejectedValue(new Error('ERR_ADM_ACTIVE_ADMISSION_EXISTS'));

    const { POST } = await import('./route');
    const req = new Request('http://localhost/api/v1/crm/leads/lead-123/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents: [
          {
            fileName: 'civil.pdf',
            fileKey: 'uploads/civil.pdf',
            fileType: 'application/pdf',
            documentType: 'CIVIL_ID_FRONT',
          },
        ],
      }),
    });

    const response = await POST(req, {
      params: Promise.resolve({ id: 'lead-123' }),
    });

    const body = await response.json();
    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_ADM_ACTIVE_ADMISSION_EXISTS');
  });
});
