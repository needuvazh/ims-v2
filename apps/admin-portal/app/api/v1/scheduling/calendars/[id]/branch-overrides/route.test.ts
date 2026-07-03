import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const withPermissionMock = vi.fn();
const assertBranchScopeMock = vi.fn();
const createBranchOverrideMock = vi.fn();

vi.mock('../../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../../../lib/auth-guard', () => ({
  assertBranchScope: assertBranchScopeMock,
}));

vi.mock('../../../../../../../lib/runtime', () => ({
  schedulingCalendarService: {
    createBranchOverride: createBranchOverrideMock,
  },
}));

vi.mock('@ims/scheduling', () => ({
  createBranchOverrideSchema: z.object({
      businessCalendarId: z.string().uuid(),
      branchId: z.string().uuid(),
      year: z.number().int(),
      effectiveStartDate: z.coerce.date(),
      effectiveEndDate: z.coerce.date().nullable().optional(),
      status: z.enum(['Draft', 'Active', 'Closed', 'Archived']).default('Draft'),
      notes: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      nameLocalized: z.any().optional().nullable(),
      operatingDays: z.array(z.any()).default([]),
    }),
}));

vi.mock('../../../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('branch override route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    assertBranchScopeMock.mockReset();
    createBranchOverrideMock.mockReset();
    withPermissionMock.mockImplementation((_req, _perm, cb) => cb({ session: { userId: 'user-1', activeBranchId: '22222222-2222-2222-2222-222222222222' } }));
    assertBranchScopeMock.mockResolvedValue({ userId: 'user-1' });
  });

  it('POST creates a branch override', async () => {
    createBranchOverrideMock.mockResolvedValue({ id: 'override-1' });

    const { POST } = await import('./route');
    const response = await POST(
      new Request('http://localhost/api/v1/scheduling/calendars/11111111-1111-1111-1111-111111111111/branch-overrides', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          branchId: '22222222-2222-2222-2222-222222222222',
          year: 2026,
          effectiveStartDate: '2026-01-01',
          operatingDays: [],
        }),
      }),
      { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) },
    );

    expect(response.status).toBe(201);
    expect(createBranchOverrideMock).toHaveBeenCalled();
  });
});
