import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

function problemJson(status: number, title: string, detail: string, errorCode: string) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
    },
    { status },
  );
}

export async function GET(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'lead.read', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const params = new URL(request.url).searchParams;
          const parsed = querySchema.safeParse({
            page: params.get('page') ?? undefined,
            limit: params.get('limit') ?? undefined,
          });

          if (!parsed.success) {
            return problemJson(
              400,
              'Invalid query parameters',
              'One or more query parameters are invalid.',
              'CRM-VAL-FOLLOWUPS-INVALID_QUERY',
            );
          }

          const { branchScopeResolver, followUpService } = await import(
            '../../../../../../lib/runtime'
          );

          // Branch scoping
          const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
            session.userId,
            session.activeBranchId ?? null,
          );

          // Counselor scoping
          const hasGlobalRead = session.permissions.includes('crm.leads.read.all');
          const counselorId = hasGlobalRead ? undefined : session.userId;

          const result = await followUpService.findGroupedFollowUps(
            'past',
            {
              counselorId,
              branchIds: allowedBranches,
            },
            {
              page: parsed.data.page,
              limit: parsed.data.limit,
            },
          );

          const response = NextResponse.json(
            {
              success: true,
              data: {
                items: result.items,
                pagination: {
                  total: result.total,
                  page: parsed.data.page,
                  limit: parsed.data.limit,
                  pages: Math.ceil(result.total / parsed.data.limit),
                },
              },
            },
            { status: 200 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/crm/leads/follow-ups/past',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error) {
          logger.error('api.crm.leads.followups.past.failed', {
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
    { route: '/api/v1/crm/leads/follow-ups/past' },
  );
}
