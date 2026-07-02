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
import { batchErrorResponse } from '../../route';
import { prisma } from '@ims/database';

const waitlistSchema = z.object({
  studentId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
}).refine(data => {
  const hasStudent = !!data.studentId;
  const hasLead = !!data.leadId;
  return (hasStudent && !hasLead) || (!hasStudent && hasLead);
}, {
  message: "Exactly one of studentId or leadId must be provided.",
  path: ["studentId"]
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

      const parsed = waitlistSchema.safeParse(payload);
      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid request body',
          'Waitlist details are invalid.',
          'CRS-VAL-BATCHES-INVALID_BODY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          }))
        );
      }

      try {
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

        const { studentId, leadId } = parsed.data;

        // Verify existence in database
        if (studentId) {
          const studentProfile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
          if (!studentProfile) throw new Error('ERR_CRS_STUDENT_NOT_FOUND');
        }
        if (leadId) {
          const lead = await prisma.lead.findUnique({ where: { id: leadId } });
          if (!lead) throw new Error('ERR_CRS_LEAD_NOT_FOUND');
        }

        const result = await batchService.enqueueWaitlist(
          id,
          studentId || null,
          leadId || null,
          session.userId
        );

        const response = NextResponse.json(
          {
            success: true,
            data: result,
          },
          { status: 201 }
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/batches/[id]/waitlist',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.waitlist.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches/[id]/waitlist' });
}
