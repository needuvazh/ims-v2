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

const CreateAdmissionRequestSchema = z.object({
  studentProfileId: z.string().uuid(),
  courseId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
});

function errorResponse(error: Error) {
  const msg = error.message;
  let status = 500;
  let code = 'ERR_ADMISSION_INTERNAL_ERROR';

  if (msg.includes('ERR_ADM_ACTIVE_ADMISSION_EXISTS')) {
    status = 409;
    code = 'ERR_ADM_ACTIVE_ADMISSION_EXISTS';
  } else if (msg.includes('ERR_STUDENT_PROFILE_NOT_FOUND')) {
    status = 404;
    code = 'ERR_STUDENT_PROFILE_NOT_FOUND';
  } else if (msg.includes('ERR_AUTH_BRANCH_DENIED')) {
    status = 403;
    code = 'ERR_AUTH_BRANCH_DENIED';
  } else if (msg.includes('ERR_STU_PROFILE_INACTIVE')) {
    status = 422;
    code = 'ERR_STU_PROFILE_INACTIVE';
  }

  return NextResponse.json(
    {
      success: false,
      errorCode: code,
      messageEnglish: msg,
      statusCode: status,
    },
    { status },
  );
}

export async function POST(request: Request) {
  return withRouteObservability(
    request.headers,
    async () =>
      withPermission(request, 'admission.create', async ({ session }) => {
        const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

        try {
          const body = await request.json();
          const parsed = CreateAdmissionRequestSchema.parse(body);

          const targetBranchId = parsed.branchId || session.activeBranchId;
          if (!targetBranchId) {
            throw new Error('ERR_AUTH_BRANCH_DENIED');
          }

          const { branchScopeResolver, admissionService } =
            await import('../../../../lib/runtime');

          // Verify branch permission scope
          const allowedBranches =
            await branchScopeResolver.resolveAllowedBranches(
              session.userId,
              session.activeBranchId ?? null,
            );
          if (!allowedBranches.includes(targetBranchId as Uuid)) {
            throw new Error('ERR_AUTH_BRANCH_DENIED');
          }

          const result = await admissionService.createAdmissionDraftDirect(
            {
              studentProfileId: parsed.studentProfileId,
              courseId: parsed.courseId || null,
              leadId: parsed.leadId || null,
            },
            session.userId,
          );

          const response = NextResponse.json(
            {
              success: true,
              admissionId: result.admissionId,
            },
            { status: 201 },
          );

          applyObservabilityResponseHeaders(response.headers, request.headers, {
            route: '/api/v1/admissions',
            method: request.method,
            status: 'success',
          });

          return response;
        } catch (error) {
          logger.error('api.admissions.create.failed', {
            status: 'failed',
            error: error as Error,
          });
          return errorResponse(error as Error);
        }
      }),
    { route: '/api/v1/admissions' },
  );
}
