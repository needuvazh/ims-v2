import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';

export async function GET(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'lead.read', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const { leadAnalyticsReadService } = await import(
            '../../../../../../lib/runtime'
          );


          const context = {
            userId: session.userId,
            activeBranchId: session.activeBranchId ?? null,
            permissions: session.permissions,
          };

          const counts = await leadAnalyticsReadService.getFollowUpCounts(context);

          const response = NextResponse.json(
            {
              success: true,
              data: counts,
            },
            { status: 200 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/crm/leads/follow-ups/counts',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error) {
          logger.error('api.crm.leads.followups.counts.failed', {
            status: 'failed',
            error: error as Error,
          });
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_CRM_INTERNAL_ERROR',
              messageEnglish: (error as Error).message || 'An unexpected error occurred.',
              statusCode: 500,
            },
            { status: 500 },
          );
        }
      }),
    { route: '/api/v1/crm/leads/follow-ups/counts' },
  );
}
