import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();
const getLeadByIdMock = vi.fn();
const deleteLeadMock = vi.fn();

vi.mock('../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../lib/runtime', () => ({
  leadService: { getLeadById: getLeadByIdMock, deleteLead: deleteLeadMock },
  branchScopeResolver: { resolveAllowedBranches: resolveAllowedBranchesMock },
}));

vi.mock('../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('CRM lead detail API routes', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
    getLeadByIdMock.mockReset();
    deleteLeadMock.mockReset();
  });

  it('GET /api/v1/crm/leads/[id] applies default PII masking to lead and linked person details', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['lead.read', 'crm.leads.read.all'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue(['11111111-1111-1111-1111-111111111111']);

    getLeadByIdMock.mockResolvedValue({
      id: 'lead-123',
      leadNumber: 'LD-2026-MCT-99999',
      firstName: 'Hamad',
      lastName: 'Al-Masrouri',
      phone: '+96899887766',
      email: 'hamad@example.com',
      branchId: '11111111-1111-1111-1111-111111111111',
      counselorId: 'user-1',
      person: {
        id: 'person-123',
        nationalId: '12345678',
        mobile: '+96899887766',
        email: 'hamad@example.com',
      },
    });

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/crm/leads/lead-123'), {
      params: Promise.resolve({ id: 'lead-123' }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.phone).toContain('***');
    expect(body.data.email).toContain('******');
    expect(body.data.person.nationalId).toContain('******');
  });

  it('DELETE /api/v1/crm/leads/[id] rejects deletion if lead is assigned to another counselor and user lacks global read permission', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['lead.delete'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue(['11111111-1111-1111-1111-111111111111']);

    getLeadByIdMock.mockResolvedValue({
      id: 'lead-123',
      branchId: '11111111-1111-1111-1111-111111111111',
      counselorId: 'another-counselor-uuid',
    });

    const { DELETE } = await import('./route');
    const response = await DELETE(new Request('http://localhost/api/v1/crm/leads/lead-123', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'lead-123' }),
    });

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.errorCode).toBe('ERR_CRM_ASSIGNED_LEAD_SCOPE_VIOLATION');
    expect(deleteLeadMock).not.toHaveBeenCalled();
  });

  it('DELETE /api/v1/crm/leads/[id] succeeds if lead is assigned to another counselor but user holds global read permission', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['lead.delete', 'crm.leads.read.all'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue(['11111111-1111-1111-1111-111111111111']);

    getLeadByIdMock.mockResolvedValue({
      id: 'lead-123',
      branchId: '11111111-1111-1111-1111-111111111111',
      counselorId: 'another-counselor-uuid',
    });

    deleteLeadMock.mockResolvedValue({ success: true });

    const { DELETE } = await import('./route');
    const response = await DELETE(new Request('http://localhost/api/v1/crm/leads/lead-123', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'lead-123' }),
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(deleteLeadMock).toHaveBeenCalledWith('lead-123', 'user-1');
  });
});
