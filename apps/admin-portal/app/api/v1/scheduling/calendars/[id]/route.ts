import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  createStructuredLogger,
  getCurrentRequestContext,
  withRouteObservability,
} from '../../../../../../lib/observability';
import { schedulingCalendarService } from '../../../../../../lib/runtime';
import { problemJson, zodInvalidFields } from '../../_shared';

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  nameLocalized: z.object({ en: z.string().trim().min(1), ar: z.string().trim().min(1) }).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  countryCode: z.string().trim().min(2).max(2).optional(),
  timezone: z.literal('Asia/Muscat').optional(),
  effectiveStartDate: z.coerce.date().optional(),
  effectiveEndDate: z.coerce.date().nullable().optional(),
  status: z.enum(['Draft', 'Active', 'Closed', 'Archived']).optional(),
  version: z.number().int().nonnegative(),
});

function mapNotFound(error: Error) {
  return problemJson(
    'https://ims.local/problems/scheduling-calendar',
    404,
    'Calendar request failed',
    error.message,
    'SCH-CAL-NOT_FOUND',
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return withRouteObservability(request.headers, async () => withPermission(request, 'scheduling.calendar.read', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const calendar = await schedulingCalendarService.getCalendar(id);
      const response = NextResponse.json({ success: true, data: calendar }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/scheduling/calendars/[id]',
        method: request.method,
        status: 'success',
      });
      return response;
    } catch (error) {
      logger.error('api.scheduling.calendars.get.failed', { status: 'failed', error: error as Error, entityId: id, entityType: 'BusinessCalendar' });
      return mapNotFound(error as Error);
    }
  }), { route: '/api/v1/scheduling/calendars/[id]' });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return withRouteObservability(request.headers, async () => withPermission(request, 'scheduling.calendar.update', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson('https://ims.local/problems/scheduling-calendar-update', 400, 'Calendar update failed', 'Request body must be valid JSON.', 'SCH-CAL-INVALID-JSON');
    }

    const parsed = updateSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        'https://ims.local/problems/scheduling-calendar-update',
        400,
        'Calendar update failed',
        'Calendar details are invalid.',
        'SCH-CAL-INVALID-BODY',
        zodInvalidFields(parsed.error.issues),
      );
    }

    try {
      const updated = await schedulingCalendarService.updateBusinessCalendar(id, parsed.data, parsed.data.version, {
        actorId: session.userId,
      });

      const response = NextResponse.json({ success: true, data: updated }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/scheduling/calendars/[id]',
        method: request.method,
        status: 'success',
      });
      return response;
    } catch (error) {
      logger.error('api.scheduling.calendars.update.failed', { status: 'failed', error: error as Error, entityId: id, entityType: 'BusinessCalendar' });
      return mapNotFound(error as Error);
    }
  }), { route: '/api/v1/scheduling/calendars/[id]' });
}
