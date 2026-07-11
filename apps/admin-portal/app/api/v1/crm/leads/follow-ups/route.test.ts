import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const resolveAllowedBranchesMock = vi.fn();
const findGroupedFollowUpsMock = vi.fn();
const getFollowUpCountsMock = vi.fn();

vi.mock('../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../lib/runtime', () => ({
  followUpService: { findGroupedFollowUps: findGroupedFollowUpsMock },
  leadAnalyticsReadService: { getFollowUpCounts: getFollowUpCountsMock },
  branchScopeResolver: { resolveAllowedBranches: resolveAllowedBranchesMock },
}));

vi.mock('../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (
    _headers: Headers,
    handler: () => Promise<Response>,
  ) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('CRM follow-ups API routes', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    resolveAllowedBranchesMock.mockReset();
    findGroupedFollowUpsMock.mockReset();
    getFollowUpCountsMock.mockReset();
  });

  it('GET /api/v1/crm/leads/follow-ups/today filters for the active counselor', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'counselor-1',
          permissions: ['lead.read'],
          activeBranchId: 'branch-1',
        },
      }),
    );

    resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);
    findGroupedFollowUpsMock.mockResolvedValue({
      items: [
        {
          id: 'followup-1',
          followUpDate: new Date(),
          lead: { id: 'lead-1', firstName: 'Ahmad' },
        },
      ],
      total: 1,
    });

    const { GET } = await import('./today/route');
    const response = await GET(
      new Request('http://localhost/api/v1/crm/leads/follow-ups/today?page=1&limit=10'),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBe(1);
    expect(findGroupedFollowUpsMock).toHaveBeenCalledWith(
      'today',
      {
        counselorId: 'counselor-1',
        branchIds: ['branch-1'],
      },
      {
        page: 1,
        limit: 10,
      },
    );
  });

  it('GET /api/v1/crm/leads/follow-ups/today bypasses counselor isolation if user has crm.leads.read.all permission', async () => {
    withPermissionMock.mockImplementation((req, perm, cb) =>
      cb({
        session: {
          userId: 'admin-1',
          permissions: ['lead.read', 'crm.leads.read.all'],
          activeBranchId: 'branch-1',
        },
      }),
    );

    resolveAllowedBranchesMock.mockResolvedValue(['branch-1']);
    findGroupedFollowUpsMock.mockResolvedValue({
      items: [],
      total: 0,
    });

    const { GET } = await import('./today/route');
    const response = await GET(
      new Request('http://localhost/api/v1/crm/leads/follow-ups/today?page=1&limit=10'),
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(findGroupedFollowUpsMock).toHaveBeenCalledWith(
      'today',
      {
        counselorId: undefined, // no counselor isolation for admin
        branchIds: ['branch-1'],
      },
      {
        page: 1,
        limit: 10,
      },
    );
  });
});
