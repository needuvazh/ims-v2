import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../lib/api-middleware';
import {
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../lib/observability';
import { createUuid } from '@ims/shared-kernel';

/**
 * POST /api/v1/students/preflight-lookup
 *
 * Performs a global lookup by email, mobile, or national ID to detect existing profiles
 * before a new student registration is submitted. Returns masked PII.
 *
 * Permission: student.create
 */
const bodySchema = z
  .object({
    email: z.string().email().optional(),
    mobile: z.string().min(7).max(20).optional(),
    nationalId: z.string().min(3).max(50).optional(),
    branchId: z.string().uuid().optional(),
  })
  .refine((d) => d.email || d.mobile || d.nationalId, {
    message: 'At least one of email, mobile, or national ID is required.',
  });

export async function POST(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'student.create', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_VAL_BODY_MISSING',
              messageEnglish: 'Request body is required.',
              statusCode: 400,
            },
            { status: 400 },
          );
        }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_VAL_FAILED',
              messageEnglish:
                parsed.error.issues[0]?.message ?? 'Validation failed.',
              statusCode: 400,
            },
            { status: 400 },
          );
        }

        try {
          const { branchScopeResolver, studentQueryService } =
            await import('../../../../../lib/runtime');
          const activeBranchId =
            parsed.data.branchId ?? session.activeBranchId ?? '';

          if (!activeBranchId) {
            throw new Error('ERR_AUTH_BRANCH_DENIED');
          }

          const allowedBranches =
            await branchScopeResolver.resolveAllowedBranches(
              createUuid(session.userId),
              session.activeBranchId
                ? createUuid(session.activeBranchId)
                : null,
            );
          if (!allowedBranches.includes(createUuid(activeBranchId))) {
            throw new Error('ERR_AUTH_BRANCH_DENIED');
          }

          const query =
            parsed.data.email ??
            parsed.data.mobile ??
            parsed.data.nationalId ??
            '';
          const result = await studentQueryService.globalPersonLookup(
            query,
            activeBranchId,
            { revealSensitive: false },
          );

          return NextResponse.json(
            { success: true, data: result },
            { status: 200 },
          );
        } catch (error) {
          logger.error('api.students.preflight-lookup.failed', {
            status: 'failed',
            error: error as Error,
          });
          if ((error as Error).message === 'ERR_AUTH_BRANCH_DENIED') {
            return NextResponse.json(
              {
                success: false,
                errorCode: 'ERR_AUTH_BRANCH_DENIED',
                messageEnglish: 'Branch scope denied.',
                statusCode: 403,
              },
              { status: 403 },
            );
          }
          return NextResponse.json(
            {
              success: false,
              errorCode: 'ERR_STUDENT_INTERNAL_ERROR',
              messageEnglish: (error as Error).message,
              statusCode: 500,
            },
            { status: 500 },
          );
        }
      }),
    { route: '/api/v1/students/preflight-lookup' },
  );
}
