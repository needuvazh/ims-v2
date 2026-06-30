import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DomainError } from '@ims/shared-kernel';
import { withPermission } from '../../../lib/api-middleware';
import { applyObservabilityResponseHeaders, withRouteObservability, createStructuredLogger, getCurrentRequestContext } from '../../../lib/observability';

const querySchema = z.object({
  branchId: z.string().uuid(),
  status: z.enum(['Active', 'Inactive', 'Draft', 'Archived']).optional().default('Active'),
});

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'organization.manage', async () => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({
        branchId: params.get('branchId') ?? undefined,
        status: params.get('status') ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            type: 'https://ims.local/problems/organization-val',
            title: 'Invalid query parameters',
            status: 400,
            detail: 'Query parameters are invalid.',
            errorCode: 'ORG-VAL-INVALID_QUERY',
            invalidFields: parsed.error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
          { status: 400 }
        );
      }

      const { organizationService } = await import('../../../lib/runtime');
      const result = await organizationService.listClassrooms({
        branchId: parsed.data.branchId,
        status: parsed.data.status as any,
        pageSize: 1000,
      });

      const response = NextResponse.json(
        {
          data: result.items,
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/organization/classrooms',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.organization.classrooms.failed', { status: 'failed', error: error as Error });
      return NextResponse.json(
        {
          type: 'https://ims.local/problems/organization',
          title: 'Failed to retrieve classrooms',
          status: 500,
          detail: error instanceof Error ? error.message : 'Unknown error occurred.',
          errorCode: 'ORG-CLASSROOMS-FAILED',
        },
        { status: 500 }
      );
    }
  }), { route: '/api/organization/classrooms' });
}
