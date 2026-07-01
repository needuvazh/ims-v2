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
import { createUuid } from '@ims/shared-kernel';
import { randomUUID } from 'crypto';

const promoteSchema = z.object({
  candidateId: z.string().uuid(),
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

      const parsed = promoteSchema.safeParse(payload);
      if (!parsed.success) {
        return problemJson(
          400,
          'Invalid request body',
          'Promotion details are invalid.',
          'CRS-VAL-BATCHES-INVALID_BODY',
          parsed.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          }))
        );
      }

      try {
        const { candidateId } = parsed.data;

        // Perform the promotion inside a database transaction to lock records and ensure consistency
        const result = await prisma.$transaction(async (tx) => {
          // Lock batch row
          const batches = await tx.$queryRawUnsafe<any[]>(
            'SELECT * FROM "batches" WHERE "id" = $1::uuid AND "isDeleted" = false FOR UPDATE',
            id
          );
          if (batches.length === 0) {
            throw new Error('ERR_CRS_BATCH_NOT_FOUND');
          }
          const batch = batches[0];

          // Fetch waitlist entry
          const entry = await tx.waitingList.findUnique({
            where: { id: candidateId },
          });
          if (!entry || entry.batchId !== id || entry.status !== 'Waiting') {
            throw new Error('ERR_CRS_WAITLIST_ENTRY_NOT_FOUND');
          }

          // Enforce capacity limits
          if (batch.currentEnrollmentCount >= batch.capacity && !batch.allowOverbooking) {
            throw new Error('ERR_CRS_BATCH_FULL');
          }

          // Promote candidate
          const promoted = await tx.waitingList.update({
            where: { id: candidateId },
            data: { status: 'Promoted' },
          });

          // Shift subsequent active entries in queue
          const activeQueue = await tx.waitingList.findMany({
            where: { batchId: id, status: 'Waiting', isDeleted: false },
            orderBy: { queuePosition: 'asc' },
          });
          for (const nextEntry of activeQueue) {
            if (nextEntry.queuePosition > entry.queuePosition) {
              await tx.waitingList.update({
                where: { id: nextEntry.id },
                data: { queuePosition: nextEntry.queuePosition - 1 },
              });
            }
          }

          // Increment enrollment count
          const updatedBatch = await tx.batch.update({
            where: { id },
            data: {
              currentEnrollmentCount: { increment: 1 },
              version: { increment: 1 },
            },
          });

          // Write outbox event
          await tx.outboxEvent.create({
            data: {
              id: createUuid(randomUUID()),
              eventType: 'WaitlistStudentPromoted',
              aggregateType: 'Batch',
              aggregateId: id,
              payload: {
                batchId: id,
                studentId: entry.studentId,
                leadId: entry.leadId,
              },
              status: 'Pending',
              availableAt: new Date(),
            },
          });

          // Log Audit event
          await tx.auditLog.create({
            data: {
              id: createUuid(randomUUID()),
              module: 'TrainingDelivery',
              performedBy: session.userId,
              performedAt: new Date(),
              entityType: 'WaitingList',
              entityId: candidateId,
              action: 'ManualPromote',
              newValue: { ...promoted, batchEnrollmentCount: updatedBatch.currentEnrollmentCount },
            },
          });

          return promoted;
        });

        const response = NextResponse.json(
          {
            success: true,
            data: result,
          },
          { status: 200 }
        );

        applyObservabilityResponseHeaders(response.headers, request.headers, {
          route: '/api/v1/batches/[id]/waitlist/promote',
          method: request.method,
          status: 'success',
        });

        return response;
      } catch (error) {
        logger.error('api.batches.waitlist-promote.failed', { status: 'failed', error: error as Error });
        return batchErrorResponse(error as Error);
      }
    })
  , { route: '/api/v1/batches/[id]/waitlist/promote' });
}
