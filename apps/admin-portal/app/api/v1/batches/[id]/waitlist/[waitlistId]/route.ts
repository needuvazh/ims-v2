import { NextResponse } from 'next/server';
import { withPermission } from '../../../../../../../lib/api-middleware';
import {
  applyObservabilityResponseHeaders,
  withRouteObservability,
  createStructuredLogger,
  getCurrentRequestContext,
} from '../../../../../../../lib/observability';
import { batchService } from '../../../../../../../lib/runtime';
import { batchErrorResponse } from '../../../route';
import { prisma } from '@ims/database';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; waitlistId: string }> }
) {
  const { id, waitlistId } = await params;
  return withRouteObservability(request.headers, async () =>
    withPermission(request, 'batch.waitlist.manage', async ({ session }) => {
      const logger = createStructuredLogger(getCurrentRequestContext() ?? {});

      try {
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

        await batchService.removeWaitlistEntry(id, waitlistId, session.userId);

        const response = NextResponse.json(
          {
            success: true,
          },
          { status: 200 }
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/batches/[id]/waitlist/[waitlistId]',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.waitlist-remove.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches/[id]/waitlist/[waitlistId]' });
}
