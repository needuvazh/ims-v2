import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const withPermissionMock = vi.fn();
const createBusinessCalendarMock = vi.fn();
const listCalendarsMock = vi.fn();

vi.mock('../../../../../lib/api-middleware', () => ({
  withPermission: withPermissionMock,
}));

vi.mock('../../../../../lib/runtime', () => ({
  schedulingCalendarService: {
    createBusinessCalendar: createBusinessCalendarMock,
    listCalendars: listCalendarsMock,
  },
}));

vi.mock('@ims/scheduling', () => ({
  createBusinessCalendarSchema: z.object({
    instituteId: z.string().uuid(),
    code: z.string().min(3),
    name: z.string().min(3),
    nameLocalized: z.object({ en: z.string().min(1), ar: z.string().min(1) }),
    year: z.number().int(),
    countryCode: z.string().length(2),
    timezone: z.literal('Asia/Muscat'),
    effectiveStartDate: z.coerce.date(),
    effectiveEndDate: z.coerce.date().nullable().optional(),
    status: z.enum(['Draft', 'Active', 'Closed', 'Archived']).default('Draft'),
    operatingDays: z.array(z.object({
      dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
      isOpen: z.boolean(),
      workingHours: z.array(z.object({
        startTime: z.string(),
        endTime: z.string(),
      })).default([]),
    })).length(7),
  }),
}));

vi.mock('../../../../../lib/observability', () => ({
  applyObservabilityResponseHeaders: vi.fn(),
  withRouteObservability: async (_headers: Headers, handler: () => Promise<Response>) => handler(),
  createStructuredLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  getCurrentRequestContext: () => ({}),
}));

function buildOperatingDays() {
  return [
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
    'SUNDAY',
  ].map((dayOfWeek) => ({
    dayOfWeek,
    isOpen: false,
    workingHours: [],
  }));
}

describe('scheduling calendar routes', () => {
  beforeEach(() => {
    withPermissionMock.mockReset();
    createBusinessCalendarMock.mockReset();
    listCalendarsMock.mockReset();
    withPermissionMock.mockImplementation((_req, _perm, cb) => cb({ session: { userId: 'user-1', activeBranchId: 'branch-1' } }));
  });

  it('POST /api/v1/scheduling/calendars creates a business calendar', async () => {
    createBusinessCalendarMock.mockResolvedValue({ id: 'calendar-1', name: '2026 Calendar' });

    const { POST } = await import('./route');
    const response = await POST(new Request('http://localhost/api/v1/scheduling/calendars', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        instituteId: '11111111-1111-1111-1111-111111111111',
        code: 'ASTI-2026',
        name: 'Academic Calendar 2026',
        nameLocalized: { en: 'Academic Calendar 2026', ar: 'التقويم الأكاديمي 2026' },
        year: 2026,
        countryCode: 'OM',
        timezone: 'Asia/Muscat',
        effectiveStartDate: '2026-01-01',
        status: 'Draft',
        operatingDays: buildOperatingDays(),
      }),
    }));

    const body = await response.json();
    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(createBusinessCalendarMock).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ASTI-2026', instituteId: '11111111-1111-1111-1111-111111111111' }),
      expect.objectContaining({ actorId: 'user-1' })
    );
  });

  it('GET /api/v1/scheduling/calendars returns calendars', async () => {
    listCalendarsMock.mockResolvedValue([{ id: 'calendar-1' }]);

    const { GET } = await import('./route');
    const response = await GET(new Request('http://localhost/api/v1/scheduling/calendars?year=2026'));

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(listCalendarsMock).toHaveBeenCalledWith(expect.objectContaining({ year: 2026 }));
  });
});
