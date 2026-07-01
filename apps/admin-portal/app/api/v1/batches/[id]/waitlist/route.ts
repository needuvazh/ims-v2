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
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';

const waitlistSchema = z.object({
  studentId: z.string().uuid().nullable().optional(),
  leadId: z.string().uuid().nullable().optional(),
}).refine(data => data.studentId || data.leadId, {
  message: "At least one of studentId or leadId must be provided.",
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
    withPermission(request, 'enrollment.create', async ({ session }) => {
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

        const { studentId, leadId } = parsed.data;

        // Verify existence in database
        if (studentId) {
          const student = await prisma.student.findUnique({ where: { id: studentId } });
          if (!student) throw new Error('ERR_CRS_STUDENT_NOT_FOUND');
        }
        if (leadId) {
          const lead = await prisma.lead.findUnique({ where: { id: leadId } });
          if (!lead) throw new Error('ERR_CRS_LEAD_NOT_FOUND');
        }

        // Lock & get active queue
        const active = await batchService.batchRepository.findActiveWaitlist(id);
        const alreadyQueued = active.some(w => 
          (studentId && w.studentId === studentId) || (leadId && w.leadId === leadId)
        );
        if (alreadyQueued) {
          return problemJson(
            422,
            'Already queued',
            'This candidate is already in the waitlist for this batch.',
            'ERR_CRS_WAITLIST_DUPLICATE'
          );
        }

        const queuePosition = active.length + 1;
        const result = await batchService.batchRepository.addWaitlistEntry({
          id: createUuid(randomUUID()),
          courseId: batch.courseId,
          batchId: id,
          studentId,
          leadId,
          queuePosition,
          status: 'Waiting',
          createdBy: session.userId,
        });

        // Audit Log
        await prisma.auditLog.create({
          data: {
            id: createUuid(randomUUID()),
            module: 'TrainingDelivery',
            performedBy: session.userId,
            performedAt: new Date(),
            entityType: 'WaitingList',
            entityId: result.id,
            action: 'AddToWaitlist',
            newValue: { ...result },
          }
        });

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
