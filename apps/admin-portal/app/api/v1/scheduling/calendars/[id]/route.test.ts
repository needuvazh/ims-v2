import { beforeEach, describe, expect, it, vi } from 'vitest';

const withPermissionMock = vi.fn();
const getCalendarMock = vi.fn();
const updateBusinessCalendarMock = vi.fn();

vi.mock('../../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../../lib/runtime', () => ({
  schedulingCalendarService: {
    getCalendar: getCalendarMock,
    updateBusinessCalendar: updateBusinessCalendarMock,
  },
}));

vi.mock('../../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

describe('scheduling calendar id route', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    getCalendarMock.mockReset();
    updateBusinessCalendarMock.mockReset();
    withPermissionMock.mockImplementation((_req, _perm, cb) => cb({ session: { userId: 'user-1' } }));
  });

  it('GET returns a calendar by id', async () => {
    getCalendarMock.mockResolvedValue({ id: '11111111-1111-1111-1111-111111111111' });

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/scheduling/calendars/11111111-1111-1111-1111-111111111111'), {
      params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }),
    });

    expect(response.status).toBe(200);
    expect(getCalendarMock).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
  });

  it('PATCH updates a calendar', async () => {
    updateBusinessCalendarMock.mockResolvedValue({ id: '11111111-1111-1111-1111-111111111111' });

    const { PATCH } = await import('./route');
    const response = await PATCH(
      new Request('http://localhost/api/v1/scheduling/calendars/11111111-1111-1111-1111-111111111111', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ version: 1, name: 'Updated Calendar' }),
      }),
      { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) },
    );

    expect(response.status).toBe(200);
    expect(updateBusinessCalendarMock).toHaveBeenCalled();
  });
});
