import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  createStructuredLogger,
  getCurrentRequestContext,
  withRouteObservability,
} from '../../../../../lib/observability';
import {
  createBusinessCalendarSchema,
  type CreateBusinessCalendarCommand,
} from '@ims/scheduling';
import { schedulingCalendarService } from '../../../../../lib/runtime';
import { problemJson, zodInvalidFields } from '../_shared';

const listSchema = z.object({
  instituteId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.enum(['Draft', 'Active', 'Closed', 'Archived']).optional(),
  q: z.string().trim().min(1).optional(),
});

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'scheduling.calendar.read', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
    const params = new URL(request.url).searchParams;
    const parsed = listSchema.safeParse({
      instituteId: params.get('instituteId') ?? undefined,
      branchId: params.get('branchId') ?? undefined,
      year: params.get('year') ?? undefined,
      status: params.get('status') ?? undefined,
      q: params.get('q') ?? undefined,
    });

    if (!parsed.success) {
      return problemJson(
        'https://ims.local/problems/scheduling-calendar-list',
        400,
        'Calendar list failed',
        'Calendar filters are invalid.',
        'SCH-CAL-INVALID-FILTERS',
        zodInvalidFields(parsed.error.issues),
      );
    }

    try {
      const data = await schedulingCalendarService.listCalendars(parsed.data);
      const response = NextResponse.json({ success: true, data }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/scheduling/calendars',
        method: request.method,
        status: 'success',
      });
      return response;
    } catch (error) {
      logger.error('api.scheduling.calendars.list.failed', { status: 'failed', error: error as Error, userId: session.userId });
      return problemJson(
        'https://ims.local/problems/scheduling-calendars',
        500,
        'Calendar list failed',
        'Unable to list calendars at this time.',
        'SCH-CAL-LIST-FAILED',
      );
    }
  }), { route: '/api/v1/scheduling/calendars' });
}

export async function POST(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'scheduling.calendar.create', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson('https://ims.local/problems/scheduling-calendar-create', 400, 'Calendar create failed', 'Request body must be valid JSON.', 'SCH-CAL-INVALID-JSON');
    }

    const parsed = createBusinessCalendarSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        'https://ims.local/problems/scheduling-calendar-create',
        400,
        'Calendar create failed',
        'Calendar details are invalid.',
        'SCH-CAL-INVALID-BODY',
        zodInvalidFields(parsed.error.issues),
      );
    }

    try {
      const created = await schedulingCalendarService.createBusinessCalendar(parsed.data as CreateBusinessCalendarCommand, {
        actorId: session.userId,
      });

      const response = NextResponse.json({ success: true, data: created }, { status: 201 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/scheduling/calendars',
        method: request.method,
        status: 'success',
      });
      return response;
    } catch (error) {
      logger.error('api.scheduling.calendars.create.failed', { status: 'failed', error: error as Error, userId: session.userId });
      return problemJson(
        'https://ims.local/problems/scheduling-calendar-create',
        400,
        'Calendar create failed',
        (error as Error).message,
        'SCH-CAL-CREATE-FAILED',
      );
    }
  }), { route: '/api/v1/scheduling/calendars' });
}
