import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withPermission } from '../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../lib/observability';
import { batchService } from '../../../../../../lib/runtime';
import { batchErrorResponse } from '../../../route';
import { prisma } from '@ims/database';

const reactivateSchema = z.object({
  waitlistId: z.string().uuid(),
});

function problemJson(
  status: number,
  title: string,
  detail: string,
  errorCode: string,
  invalidFields?: Array<{ field: string; message: string }>
) {
  return NextResponse.json(
    {
      success: false,
      errorCode,
      messageEnglish: detail,
      statusCode: status,
      invalidFields,
    },
    { status }
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'batch.waitlist.manage', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      let payload: unknown;
      try {
        payload = await request.json();
      } catch {
        return problemJson(
          400,
          'Invalid request body',
          'Request body must be valid JSON.',
          'CRS-VAL-BATCHES-INVALID_JSON'
        );
      }

      const parsed = reactivateSchema.safeParse(payload);
      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid request body',
          'Reactivate details are invalid.',
          'CRS-VAL-BATCHES-INVALID_BODY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          }))
        );
      }

      try {
        const { waitlistId } = parsed.data;

        // Fetch batch
        const batch = await batchService.batchRepository.findById(id);
        if (!batch) {
          throw new Error('ERR_CRS_BATCH_NOT_FOUND');
        }

        // Branch-scoping guard
        const hasAccess = await prisma.userBranchAccess.findFirst({
          where: { userId: session.userId, branchId: batch.branchId, status: 'Active' },
        });
        if (!hasAccess) {
          const userRoles = await prisma.userRole.findMany({
            where: { userId: session.userId },
            include: { role: true },
          });
          const isSuperAdmin = userRoles.some(
            (ur) => ur.role.roleCode === 'SUPER_ADMIN' || ur.role.roleCode === 'OWNER'
          );
          if (!isSuperAdmin) {
            throw new Error('ERR_IAM_INSUFFICIENT_PERMISSIONS');
          }
        }

        const result = await batchService.reactivateWaitlistEntry(id, waitlistId, session.userId);

        const response = NextResponse.json(
          {
            success: true,
            data: result,
          },
          { status: 200 }
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/batches/[id]/waitlist/reactivate',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.waitlist-reactivate.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches/[id]/waitlist/reactivate' });
}
