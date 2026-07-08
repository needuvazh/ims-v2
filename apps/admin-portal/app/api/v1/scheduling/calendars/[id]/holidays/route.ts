import { NextResponse } from 'next/server';
import { assertBranchScope } from '../../../../../../../lib/auth-guard';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  createStructuredLogger,
  getCurrentRequestContext,
  withRouteObservability,
} from '../../../../../../../lib/observability';
import { schedulingCalendarService } from '../../../../../../../lib/runtime';
import { createHolidaySchema } from '@ims/scheduling';
import { problemJson, zodInvalidFields } from '../../../_shared';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(
        request,
        'scheduling.holiday.create',
        async ({ session }) => {
          const logger = createStructuredLogger(
            getCurrentRequestContext() ?? {},
          );

          let payload: unknown;
          try {
            payload = await request.json();
          } catch {
            return problemJson(
              'https://ims.local/problems/scheduling-holiday-create',
              400,
              'Holiday create failed',
              'Request body must be valid JSON.',
              'SCH-HOL-INVALID-JSON',
            );
          }

          const parsed = createHolidaySchema.safeParse({
            ...(payload as Record<string, unknown>),
            businessCalendarId: id,
          });
          if (!parsed.success) {
            return problemJson(
              'https://ims.local/problems/scheduling-holiday-create',
              400,
              'Holiday create failed',
              'Holiday details are invalid.',
              'SCH-HOL-INVALID-BODY',
              zodInvalidFields(parsed.error.issues),
            );
          }

          try {
            if (parsed.data.branchId) {
              await assertBranchScope(parsed.data.branchId);
            }

            const created = await schedulingCalendarService.createHoliday(
              parsed.data,
              { actorId: session.userId },
            );
            const response = NextResponse.json(
              { success: true, data: created },
              { status: 201 },
            );
            applyObservabilityResponseHeaders(
              response.headers,
              request.headers,
              {
                route: '/api/v1/scheduling/calendars/[id]/holidays',
                method: request.method,
                status: 'success',
              },
            );
            return response;
          } catch (error) {
            logger.error('api.scheduling.holidays.create.failed', {
              status: 'failed',
              error: error as Error,
              entityId: id,
              entityType: 'BusinessCalendar',
            });
            return problemJson(
              'https://ims.local/problems/scheduling-holiday-create',
              400,
              'Holiday create failed',
              (error as Error).message,
              'SCH-HOL-CREATE-FAILED',
            );
          }
        },
      ),
    { route: '/api/v1/scheduling/calendars/[id]/holidays' },
  );
}
