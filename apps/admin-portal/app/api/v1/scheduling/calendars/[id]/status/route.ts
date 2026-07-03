import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  createStructuredLogger,
  getCurrentRequestContext,
  withRouteObservability,
} from '../../../../../../../lib/observability';
import { schedulingCalendarService } from '../../../../../../../lib/runtime';
import { problemJson, zodInvalidFields } from '../../../_shared';

const statusSchema = z.object({
  status: z.enum(['Active', 'Closed', 'Archived']),
  version: z.number().int().nonnegative(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return withRouteObservability(request.headers, async () => withPermission(request, 'scheduling.calendar.update', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return problemJson('https://ims.local/problems/scheduling-calendar-status', 400, 'Calendar status update failed', 'Request body must be valid JSON.', 'SCH-CAL-INVALID-JSON');
    }

    const parsed = statusSchema.safeParse(payload);
    if (!parsed.success) {
      return problemJson(
        'https://ims.local/problems/scheduling-calendar-status',
        400,
        'Calendar status update failed',
        'Calendar status details are invalid.',
        'SCH-CAL-INVALID-BODY',
        zodInvalidFields(parsed.error.issues),
      );
    }

    try {
      const updated =
        parsed.data.status === 'Active'
          ? await schedulingCalendarService.activateBusinessCalendar(id, parsed.data.version, { actorId: session.userId })
          : parsed.data.status === 'Closed'
            ? await schedulingCalendarService.closeBusinessCalendar(id, parsed.data.version, { actorId: session.userId })
            : await schedulingCalendarService.archiveBusinessCalendar(id, parsed.data.version, { actorId: session.userId });

      const response = NextResponse.json({ success: true, data: updated }, { status: 200 });
      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/scheduling/calendars/[id]/status',
        method: request.method,
        status: 'success',
      });
      return response;
    } catch (error) {
      logger.error('api.scheduling.calendars.status.failed', { status: 'failed', error: error as Error, entityId: id, entityType: 'BusinessCalendar' });
      return problemJson(
        'https://ims.local/problems/scheduling-calendar-status',
        400,
        'Calendar status update failed',
        (error as Error).message,
        'SCH-CAL-STATUS-FAILED',
      );
    }
  }), { route: '/api/v1/scheduling/calendars/[id]/status' });
}
