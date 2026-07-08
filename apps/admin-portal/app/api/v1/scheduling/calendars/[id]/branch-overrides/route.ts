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
import { createBranchOverrideSchema } from '@ims/scheduling';
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
        'scheduling.calendar.update',
        async ({ session }) => {
          const logger = createStructuredLogger(
            getCurrentRequestContext() ?? {},
          );

          let payload: unknown;
          try {
            payload = await request.json();
          } catch {
            return problemJson(
              'https://ims.local/problems/scheduling-branch-override-create',
              400,
              'Branch override create failed',
              'Request body must be valid JSON.',
              'SCH-CAL-INVALID-JSON',
            );
          }

          const parsed = createBranchOverrideSchema.safeParse({
            ...(payload as Record<string, unknown>),
            businessCalendarId: id,
          });
          if (!parsed.success) {
            return problemJson(
              'https://ims.local/problems/scheduling-branch-override-create',
              400,
              'Branch override create failed',
              'Branch override details are invalid.',
              'SCH-CAL-INVALID-BODY',
              zodInvalidFields(parsed.error.issues),
            );
          }

          try {
            await assertBranchScope(parsed.data.branchId);
            const created =
              await schedulingCalendarService.createBranchOverride(
                parsed.data,
                {
                  actorId: session.userId,
                  branchId: session.activeBranchId ?? undefined,
                },
              );

            const response = NextResponse.json(
              { success: true, data: created },
              { status: 201 },
            );
            applyObservabilityResponseHeaders(
              response.headers,
              request.headers,
              {
                route: '/api/v1/scheduling/calendars/[id]/branch-overrides',
                method: request.method,
                status: 'success',
              },
            );
            return response;
          } catch (error) {
            logger.error('api.scheduling.branch-overrides.create.failed', {
              status: 'failed',
              error: error as Error,
              entityId: id,
              entityType: 'BusinessCalendar',
            });
            return problemJson(
              'https://ims.local/problems/scheduling-branch-override-create',
              400,
              'Branch override create failed',
              (error as Error).message,
              'SCH-CAL-BRANCH-OVERRIDE-FAILED',
            );
          }
        },
      ),
    { route: '/api/v1/scheduling/calendars/[id]/branch-overrides' },
  );
}
