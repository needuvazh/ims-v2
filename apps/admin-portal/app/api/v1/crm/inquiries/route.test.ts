import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();
const captureInquiryMock = vi.fn();
const findAllInquiriesMock = vi.fn();

vi.mock('../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../lib/runtime', () => ({
  inquiryService: { captureInquiry: captureInquiryMock, findAll: findAllInquiriesMock },
  branchScopeResolver: { resolveAllowedBranches: resolveAllowedBranchesMock },
}));

vi.mock('../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('CRM inquiries API routes', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
    captureInquiryMock.mockReset();
    findAllInquiriesMock.mockReset();
  });

  it('GET /api/v1/crm/inquiries applies default PII masking to results', async () => {
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

    findAllInquiriesMock.mockResolvedValue({
      items: [
        {
          id: 'inq-1',
          inquiryNumber: 'INQ-001',
          firstName: 'Said',
          lastName: 'Al-Busaidi',
          mobile: '+96899123456',
          email: 'said.busaidi@example.com',
          branchId: '11111111-1111-1111-1111-111111111111',
        },
      ],
      total: 1,
    });

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/crm/inquiries'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.inquiries[0].mobile).not.toBe('+96899123456');
    expect(body.data.inquiries[0].mobile).toContain('***');
    expect(body.data.inquiries[0].email).not.toBe('said.busaidi@example.com');
    expect(body.data.inquiries[0].email).toContain('******');
  });

  it('POST /api/v1/crm/inquiries rejects branch-scope mismatch', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'user-1',
          permissions: ['lead.create'],
          activeBranchId: '11111111-1111-1111-1111-111111111111',
        },
      })
    );

    resolveAllowedBranchesMock.mockResolvedValue(['11111111-1111-1111-1111-111111111111']);

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/crm/inquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          branchId: '22222222-2222-2222-2222-222222222222',
          firstName: 'Ali',
          lastName: 'Al-Balushi',
          mobile: '+96891234567',
          email: 'ali@example.com',
          source: 'Web',
        }),
      })
    );

    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.errorCode).toBe('ERR_CRM_BRANCH_SCOPE_VIOLATION');
  });
});
