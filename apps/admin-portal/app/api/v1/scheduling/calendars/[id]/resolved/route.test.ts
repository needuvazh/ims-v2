import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const assertBranchScopeMock = vi.fn();
const resolveCalendarMock = vi.fn();

vi.mock('../../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../../../lib/auth-guard', () => ({
  assertBranchScope: assertBranchScopeMock,
}));

vi.mock('../../../../../../../lib/runtime', () => ({
  schedulingCalendarService: {
    resolveCalendar: resolveCalendarMock,
  },
}));

vi.mock('../../../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (
    _headers: Headers,
    handler: () => Promise<Response>,
  ) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('resolved calendar route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    assertBranchScopeMock.mockReset();
    resolveCalendarMock.mockReset();
    withPermissionMock.mockImplementation((_req, _perm, cb) =>
      cb({ session: { userId: 'user-1' } }),
    );
    assertBranchScopeMock.mockResolvedValue({ userId: 'user-1' });
  });

  it('resolves a branch calendar against the requested institute', async () => {
    resolveCalendarMock.mockResolvedValue({
      source: 'institute-calendar',
      resolvedOperatingDays: [],
      holidays: [],
      branchOverride: null,
      businessCalendar: { id: 'calendar-1' },
    });

    const { GET } = await import('./route');
    const response = await GET(
      new Request(
        'http://localhost/api/v1/scheduling/calendars/11111111-1111-1111-1111-111111111111/resolved?instituteId=22222222-2222-2222-2222-222222222222',
      ),
      {
        params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }),
      },
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(assertBranchScopeMock).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
    );
    expect(resolveCalendarMock).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      expect.any(Date),
      '22222222-2222-2222-2222-222222222222',
    );
  });
});
