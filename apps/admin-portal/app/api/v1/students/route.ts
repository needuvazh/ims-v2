import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../lib/observability';
import type { Uuid } from '@ims/shared-kernel';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().trim().default(''),
  branchId: z.string().uuid().optional(),
  admissionStatus: z.string().trim().optional(),
  studentStatus: z.string().trim().optional(),
});

export async function GET(request: Request) {
  return withRouteObservability(request.headers, async () => withPermission(request, 'student.read', async ({ session }) => {
    const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

    try {
      const params = new URL(request.url).searchParams;
      const parsed = querySchema.safeParse({
        page: params.get('page') ?? undefined,
        limit: params.get('limit') ?? undefined,
        search: params.get('search') ?? undefined,
        branchId: params.get('branchId') ?? undefined,
        admissionStatus: params.get('admissionStatus') ?? undefined,
        studentStatus: params.get('studentStatus') ?? undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            errorCode: 'ERR_VAL_FAILED',
            messageEnglish: 'Invalid query parameters.',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      const { branchScopeResolver, studentQueryService } = await import('../../../../lib/runtime');

      // Resolve branch scope for active user
      const allowedBranches = await branchScopeResolver.resolveAllowedBranches(
        session.userId,
        session.activeBranchId ?? null
      );

      const result = await studentQueryService.searchBranchScopedStudents(
        parsed.data.search,
        allowedBranches as string[],
        {
          page: parsed.data.page,
          limit: parsed.data.limit,
          branchId: parsed.data.branchId,
          admissionStatus: parsed.data.admissionStatus,
          studentStatus: parsed.data.studentStatus,
        }
      );

      const response = NextResponse.json(
        {
          success: true,
          data: {
            students: result.items,
            pagination: {
              total: result.total,
              page: parsed.data.page,
              limit: parsed.data.limit,
              pages: Math.ceil(result.total / parsed.data.limit),
            },
          },
        },
        { status: 200 }
      );

      applyObservabilityResponseHeaders(response.headers, request.headers, {
        route: '/api/v1/students',
        method: request.method,
        status: 'success',
      });

      return response;
    } catch (error) {
      logger.error('api.students.list.failed', { status: 'failed', error: error as Error });
      return NextResponse.json(
        {
          success: false,
          errorCode: 'ERR_STUDENT_INTERNAL_ERROR',
          messageEnglish: (error as Error).message,
          statusCode: 500,
        },
        { status: 500 }
      );
    }
  }), { route: '/api/v1/students' });
}
