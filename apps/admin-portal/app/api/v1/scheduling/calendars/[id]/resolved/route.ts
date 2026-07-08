import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertBranchScope } from '../../../../../../../lib/auth-guard';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  createStructuredLogger,
  getCurrentRequestContext,
  withRouteObservability,
} from '../../../../../../../lib/observability';
import { schedulingCalendarService } from '../../../../../../../lib/runtime';
import { problemJson, zodInvalidFields } from '../../../_shared';

const resolvedSchema = z.object({
  instituteId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  date: z.coerce.date().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'scheduling.calendar.read', async () => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});
        const searchParams = new URL(request.url).searchParams;
        const parsed = resolvedSchema.safeParse({
          instituteId: searchParams.get('instituteId') ?? undefined,
          branchId: searchParams.get('branchId') ?? undefined,
          date: searchParams.get('date') ?? undefined,
        });

        if (!parsed.success) {
          return problemJson(
            'https://ims.local/problems/scheduling-calendar-resolved',
            400,
            'Resolved calendar lookup failed',
            'Resolved calendar parameters are invalid.',
            'SCH-CAL-INVALID-RESOLVE',
            zodInvalidFields(parsed.error.issues),
          );
        }

        try {
          const branchId = parsed.data.branchId ?? id;
          await assertBranchScope(branchId);

          const resolved = await schedulingCalendarService.resolveCalendar(
            branchId,
            parsed.data.date ?? new Date(),
            parsed.data.instituteId,
          );

          const response = NextResponse.json(
            { success: true, data: resolved },
            { status: 200 },
          );
          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/scheduling/calendars/[id]/resolved',
            method: request.method,
            status: 'success',
          });
          return response;
        } catch (error) {
          logger.error('api.scheduling.calendars.resolved.failed', {
            status: 'failed',
            error: error as Error,
            entityId: id,
            entityType: 'BusinessCalendar',
          });
          return problemJson(
            'https://ims.local/problems/scheduling-calendar-resolved',
            400,
            'Resolved calendar lookup failed',
            (error as Error).message,
            'SCH-CAL-RESOLVE-FAILED',
          );
        }
      }),
    { route: '/api/v1/scheduling/calendars/[id]/resolved' },
  );
}
